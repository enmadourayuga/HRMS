from django.db import models

class LeaveRequest(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    employee_id = models.CharField(max_length=50)
    employee_name = models.CharField(max_length=100)
    department = models.CharField(max_length=100, blank=True, null=True)
    leave_type = models.CharField(max_length=50)
    start_date = models.DateField()
    end_date = models.DateField()
    days = models.IntegerField(default=1)
    reason = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=50, default='Pending')
    applied_on = models.DateField(null=True, blank=True)
    reviewed_by = models.CharField(max_length=100, blank=True, null=True)
    review_comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-applied_on', '-created_at']

    def __str__(self):
        return f"{self.employee_name} ({self.leave_type}): {self.start_date} to {self.end_date} - {self.status}"
