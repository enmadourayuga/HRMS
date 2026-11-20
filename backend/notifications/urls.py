from django.urls import path
from .views import notification_stream, notification_poll

urlpatterns = [
    path('stream/', notification_stream, name='notification_stream'),
    path('poll/', notification_poll, name='notification_poll'),
]
