from rest_framework import serializers
from employees.models import Employee
from .models import PayrollEntry


class PayrollEntrySerializer(serializers.ModelSerializer):
    employee_id = serializers.PrimaryKeyRelatedField(
        source='employee', queryset=Employee.objects.all()
    )
    employee_name = serializers.CharField(source='employee.name', read_only=True)

    class Meta:
        model = PayrollEntry
        fields = [
            'id', 'employee_id', 'employee_name', 'month', 'year',
            'pay_date', 'base_salary', 'allowances', 'deductions',
            'gross_pay', 'total_deductions', 'net_pay', 'status',
            'reviewed_by', 'approved_at', 'attendance_summary', 'monthly_ctc',
        ]
