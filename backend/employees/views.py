import os
import time
from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Employee
from .serializers import EmployeeSerializer

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_avatar(self, request):
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
