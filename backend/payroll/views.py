from rest_framework import viewsets, permissions
from .models import PayrollEntry
from .serializers import PayrollEntrySerializer

class PayrollEntryViewSet(viewsets.ModelViewSet):
    queryset = PayrollEntry.objects.all()
    serializer_class = PayrollEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
