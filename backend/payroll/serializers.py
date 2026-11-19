from rest_framework import serializers
from .models import PayrollEntry

class PayrollEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollEntry
        fields = '__all__'
