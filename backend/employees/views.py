import os
import time
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from authentication.models import User
from .models import Employee
from .serializers import EmployeeSerializer

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        user = request.user
        is_admin = getattr(user, 'is_hr_admin', False) or getattr(user, 'is_superuser', False)
        is_hr = getattr(user, 'role', '') == 'hr' or is_admin

        if not is_hr:
            return Response({'detail': 'You do not have permission to create employees.'}, status=status.HTTP_403_FORBIDDEN)

        target_role = request.data.get('role', 'employee')
        target_is_hr_admin = request.data.get('is_hr_admin', False)
        is_target_hr = (target_role == 'hr') or bool(target_is_hr_admin)

        if is_target_hr and not is_admin:
            return Response({'detail': 'Only HR administrators can create new HR accounts.'}, status=status.HTTP_403_FORBIDDEN)

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        user = request.user
        is_admin = getattr(user, 'is_hr_admin', False) or getattr(user, 'is_superuser', False)
        target_role = request.data.get('role')
        target_is_hr_admin = request.data.get('is_hr_admin')

        if (target_role == 'hr' or target_is_hr_admin) and not is_admin:
            instance = self.get_object()
            if instance.role != 'hr' or not instance.is_hr_admin:
                return Response({'detail': 'Only HR administrators can assign HR roles or privileges.'}, status=status.HTTP_403_FORBIDDEN)

        if 'avatar' in request.data and not (user.role == 'hr' or user.is_hr_admin):
            return Response({'error': 'Only HR administrators can change profile pictures for employees.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        user = request.user
        is_admin = getattr(user, 'is_hr_admin', False) or getattr(user, 'is_superuser', False)
        target_role = request.data.get('role')
        target_is_hr_admin = request.data.get('is_hr_admin')

        if (target_role == 'hr' or target_is_hr_admin) and not is_admin:
            instance = self.get_object()
            if instance.role != 'hr' or not instance.is_hr_admin:
                return Response({'detail': 'Only HR administrators can assign HR roles or privileges.'}, status=status.HTTP_403_FORBIDDEN)

        if 'avatar' in request.data and not (user.role == 'hr' or user.is_hr_admin):
            return Response({'error': 'Only HR administrators can change profile pictures for employees.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def perform_update(self, serializer):
        instance = serializer.save()
        if 'status' in serializer.validated_data:
            user = instance.user or User.objects.filter(employee_id=instance.id).first() or User.objects.filter(email=instance.email).first()
            if user:
                user.is_active = (instance.status == 'Active')
                user.save(update_fields=['is_active'])

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        if not (request.user.role == 'hr' or request.user.is_hr_admin):
            return Response({'error': 'Only HR administrators can change account status.'}, status=status.HTTP_403_FORBIDDEN)

        employee = self.get_object()

        # Prevent HR administrator from deactivating their own account
        if (employee.email == request.user.email or employee.id == request.user.employee_id) and employee.status == 'Active':
            return Response({'error': 'You cannot deactivate your own HR administrator account.'}, status=status.HTTP_400_BAD_REQUEST)

        new_status = 'Inactive' if employee.status == 'Active' else 'Active'
        employee.status = new_status
        employee.save(update_fields=['status'])

        user = employee.user or User.objects.filter(employee_id=employee.id).first() or User.objects.filter(email=employee.email).first()
        if user:
            user.is_active = (new_status == 'Active')
            user.save(update_fields=['is_active'])

        return Response({
            'id': employee.id,
            'name': employee.name,
            'status': employee.status,
            'is_active': (new_status == 'Active')
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_avatar(self, request):
        if not (request.user.role == 'hr' or request.user.is_hr_admin):
            return Response({'error': 'Only HR administrators can change profile pictures for employees.'}, status=status.HTTP_403_FORBIDDEN)

        file_obj = request.FILES.get('avatar')
        if not file_obj:
            return Response({'error': 'No avatar file provided'}, status=status.HTTP_400_BAD_REQUEST)

        avatar_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
        os.makedirs(avatar_dir, exist_ok=True)

        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']:
            ext = '.png'
        filename = f"avatar_{int(time.time() * 1000)}{ext}"
        rel_path = os.path.join('avatars', filename)
        saved_path = default_storage.save(rel_path, file_obj)

        avatar_url = request.build_absolute_uri(f"{settings.MEDIA_URL}{saved_path.replace(os.sep, '/')}")
        return Response({'avatar_url': avatar_url}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def update_avatar(self, request, pk=None):
        if not (request.user.role == 'hr' or request.user.is_hr_admin):
            return Response({'error': 'Only HR administrators can change profile pictures for employees.'}, status=status.HTTP_403_FORBIDDEN)

        employee = self.get_object()
        file_obj = request.FILES.get('avatar')
        if not file_obj:
            return Response({'error': 'No avatar file provided'}, status=status.HTTP_400_BAD_REQUEST)

        avatar_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
        os.makedirs(avatar_dir, exist_ok=True)

        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']:
            ext = '.png'
        filename = f"emp_{employee.id}_{int(time.time())}{ext}"
        rel_path = os.path.join('avatars', filename)
        saved_path = default_storage.save(rel_path, file_obj)

        avatar_url = request.build_absolute_uri(f"{settings.MEDIA_URL}{saved_path.replace(os.sep, '/')}")
        employee.avatar = avatar_url
        employee.save(update_fields=['avatar'])

        return Response({'avatar': employee.avatar}, status=status.HTTP_200_OK)
