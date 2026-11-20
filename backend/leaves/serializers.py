from rest_framework import serializers
from employees.models import Employee
from .models import LeaveRequest


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_id = serializers.PrimaryKeyRelatedField(
        source='employee', queryset=Employee.objects.all()
    )
    employee_name = serializers.CharField(source='employee.name', read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'employee_id', 'employee_name', 'department', 'leave_type',
            'start_date', 'end_date', 'days', 'reason', 'status',
            'applied_on', 'reviewed_by', 'review_comment', 'created_at',
        ]
