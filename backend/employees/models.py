from django.db import models
from authentication.models import User

class Employee(models.Model):
    id = models.CharField(max_length=20, primary_key=True)
    user = models.OneToOneField(User, on_delete=models.SET_NULL, related_name='employee', null=True, blank=True)
    name = models.CharField(max_length=100)
    email = models.EmailField()
    job_title = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    role = models.CharField(max_length=20)
    is_hr_admin = models.BooleanField(default=False)
    join_date = models.DateField(null=True, blank=True)
    salary = models.IntegerField(default=0)
    phone = models.CharField(max_length=30, blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)
    avatar = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, default='Active')
    manager = models.CharField(max_length=100, blank=True, null=True)
    employment_type = models.CharField(max_length=20, default='Full-Time')
    biometric_ref = models.CharField(max_length=50, blank=True, null=True)
    salary_structure_id = models.CharField(max_length=20, blank=True, null=True)
    leave_balances = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.name} ({self.id})"
