from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PayrollEntryViewSet

router = DefaultRouter()
router.register(r'', PayrollEntryViewSet, basename='payroll')

urlpatterns = [
    path('', include(router.urls)),
]
