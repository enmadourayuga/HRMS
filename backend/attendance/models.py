from django.db import models
from employees.models import Employee


class AttendanceRecord(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    clock_in = models.CharField(max_length=30, null=True, blank=True)
    clock_out = models.CharField(max_length=30, null=True, blank=True)
    status = models.CharField(max_length=50)
    total_hours = models.FloatField(default=0.0)
    is_validated = models.BooleanField(default=False)
    validated_by = models.CharField(max_length=100, null=True, blank=True)
    validated_at = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.employee.name} ({self.date}) - {self.status}"
