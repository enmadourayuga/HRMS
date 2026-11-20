from rest_framework import serializers
from employees.models import Employee
from .models import AttendanceRecord


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_id = serializers.PrimaryKeyRelatedField(
        source='employee', queryset=Employee.objects.all()
    )
    employee_name = serializers.CharField(source='employee.name', read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'employee_id', 'employee_name', 'date', 'clock_in',
            'clock_out', 'status', 'total_hours', 'is_validated',
            'validated_by', 'validated_at',
        ]
