from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User
from .serializers import UserSerializer, CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        user = request.user
        is_admin = getattr(user, 'is_hr_admin', False) or getattr(user, 'is_superuser', False)
        is_hr = getattr(user, 'role', '') == 'hr' or is_admin
        if not is_hr:
            return Response({'detail': 'Only HR administrators can create new accounts.'}, status=status.HTTP_403_FORBIDDEN)

        role = request.data.get('role', 'employee')
        is_hr_admin = request.data.get('is_hr_admin', False)
        if (role == 'hr' or is_hr_admin) and not is_admin:
            return Response({'detail': 'Only HR administrators can create new HR accounts.'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        user = request.user
        is_admin = getattr(user, 'is_hr_admin', False) or getattr(user, 'is_superuser', False)
        is_hr = getattr(user, 'role', '') == 'hr' or is_admin
        if not is_hr:
            return Response({'detail': 'Employees are not allowed to edit user information.'}, status=status.HTTP_403_FORBIDDEN)

        role = request.data.get('role')
        is_hr_admin = request.data.get('is_hr_admin')
        if (role == 'hr' or is_hr_admin) and not is_admin:
            instance = self.get_object()
            if instance.role != 'hr' or not instance.is_hr_admin:
                return Response({'detail': 'Only HR administrators can assign HR roles or privileges.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        user = request.user
        is_admin = getattr(user, 'is_hr_admin', False) or getattr(user, 'is_superuser', False)
        is_hr = getattr(user, 'role', '') == 'hr' or is_admin
        if not is_hr:
            return Response({'detail': 'Employees are not allowed to edit user information.'}, status=status.HTTP_403_FORBIDDEN)

        role = request.data.get('role')
        is_hr_admin = request.data.get('is_hr_admin')
        if (role == 'hr' or is_hr_admin) and not is_admin:
            instance = self.get_object()
            if instance.role != 'hr' or not instance.is_hr_admin:
                return Response({'detail': 'Only HR administrators can assign HR roles or privileges.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        is_admin = getattr(user, 'is_hr_admin', False) or getattr(user, 'is_superuser', False)
        is_hr = getattr(user, 'role', '') == 'hr' or is_admin
        if not is_hr:
            return Response({'detail': 'Employees are not allowed to delete users.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)
