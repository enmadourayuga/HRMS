from django.db import models

class AttendanceRecord(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    employee_id = models.CharField(max_length=50)
    employee_name = models.CharField(max_length=100)
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
        return f"{self.employee_name} ({self.date}) - {self.status}"
