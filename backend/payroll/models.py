from django.db import models
from employees.models import Employee


class PayrollEntry(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payroll_entries')
    month = models.CharField(max_length=50)
    year = models.IntegerField(default=2026)
    pay_date = models.DateField(null=True, blank=True)
    base_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    allowances = models.JSONField(default=dict, blank=True)
    deductions = models.JSONField(default=dict, blank=True)
    gross_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_pay = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=50, default='Pending Approval')
    reviewed_by = models.CharField(max_length=100, null=True, blank=True)
    approved_at = models.CharField(max_length=50, null=True, blank=True)
    attendance_summary = models.JSONField(default=dict, blank=True)
    monthly_ctc = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ['-year', '-month']

    def __str__(self):
        return f"{self.employee.name} - {self.month} {self.year} ({self.net_pay})"
