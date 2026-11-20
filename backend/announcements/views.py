from rest_framework import viewsets, permissions
from .models import Announcement
from .serializers import AnnouncementSerializer
from notifications import broadcast_notification


class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        instance = serializer.save()
        broadcast_notification(
            event_type='announcement_new',
            message=f"New announcement: {instance.title}",
            data={'id': instance.id, 'title': instance.title, 'author': instance.author}
        )
