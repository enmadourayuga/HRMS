import os
import json
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from authentication.models import User
from employees.models import Employee
from attendance.models import AttendanceRecord
from leaves.models import LeaveRequest
from payroll.models import PayrollEntry
from announcements.models import Announcement

class Command(BaseCommand):
    help = 'Load seed data from backend/data/seedData.json'

    def handle(self, *args, **options):
        seed_path = settings.BASE_DIR / 'data' / 'seedData.json'
        if not seed_path.exists():
            # Try alternate path
            seed_path = Path(__file__).resolve().parent.parent.parent.parent / 'data' / 'seedData.json'

        if not seed_path.exists():
            self.stdout.write(self.style.ERROR(f'Seed file not found at {seed_path}'))
            return

        with open(seed_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 1. Users
        users_count = 0
        user_map = {}
        for u in data.get('users', []):
            user, created = User.objects.get_or_create(
                id=u['id'],
                defaults={
                    'email': u['email'],
                    'role': u.get('role', 'employee'),
                    'is_hr_admin': u.get('isHrAdmin', False),
                    'employee_id': u.get('employeeId'),
                    'is_staff': u.get('isHrAdmin', False),
                }
            )
            if created or not user.has_usable_password():
                user.set_password(u.get('password', 'password123'))
                user.save()
            user_map[u['id']] = user
            if u.get('employeeId'):
                user_map[u['employeeId']] = user
            users_count += 1
        self.stdout.write(self.style.SUCCESS(f'Processed {users_count} users.'))

        # 2. Employees
        emp_count = 0
        for e in data.get('employees', []):
            user = user_map.get(e['id'])
            Employee.objects.update_or_create(
                id=e['id'],
                defaults={
                    'user': user,
                    'name': e.get('name', ''),
                    'email': e.get('email', ''),
                    'job_title': e.get('jobTitle', ''),
                    'department': e.get('department', ''),
                    'role': e.get('role', 'employee'),
                    'is_hr_admin': e.get('isHrAdmin', False),
                    'join_date': e.get('joinDate'),
                    'salary': e.get('salary', 0),
                    'phone': e.get('phone', ''),
                    'location': e.get('location', ''),
                    'avatar': e.get('avatar'),
                    'status': e.get('status', 'Active'),
                    'manager': e.get('manager'),
                    'employment_type': e.get('employmentType', 'Full-Time'),
                    'biometric_ref': e.get('biometricRef'),
                    'salary_structure_id': e.get('salaryStructureId'),
                    'leave_balances': e.get('leaveBalances', {
                        'annual': {'total': 20, 'used': 0},
                        'sick': {'total': 10, 'used': 0},
                        'casual': {'total': 5, 'used': 0}
                    }),
                }
            )
            emp_count += 1
        self.stdout.write(self.style.SUCCESS(f'Processed {emp_count} employees.'))

        # 3. Attendance (uses FK to Employee)
        att_count = 0
        for a in data.get('attendance', []):
            AttendanceRecord.objects.update_or_create(
                id=a['id'],
                defaults={
                    'employee_id': a.get('employeeId', ''),
                    'date': a.get('date'),
                    'clock_in': a.get('clockIn'),
                    'clock_out': a.get('clockOut'),
                    'status': a.get('status', 'Present'),
                    'total_hours': a.get('totalHours', 0.0) or 0.0,
                    'is_validated': a.get('isValidated', False),
                    'validated_by': a.get('validatedBy'),
                    'validated_at': a.get('validatedAt'),
                }
            )
            att_count += 1
        self.stdout.write(self.style.SUCCESS(f'Processed {att_count} attendance records.'))

        # 4. Leaves (uses FK to Employee)
        leave_count = 0
        for lv in data.get('leaves', []):
            LeaveRequest.objects.update_or_create(
                id=lv['id'],
                defaults={
                    'employee_id': lv.get('employeeId', ''),
                    'department': lv.get('department', ''),
                    'leave_type': lv.get('leaveType', 'Annual'),
                    'start_date': lv.get('startDate'),
                    'end_date': lv.get('endDate'),
                    'days': lv.get('days', 1),
                    'reason': lv.get('reason', ''),
                    'status': lv.get('status', 'Pending'),
                    'applied_on': lv.get('appliedOn'),
                    'reviewed_by': lv.get('reviewedBy'),
                    'review_comment': lv.get('reviewComment', ''),
                }
            )
            leave_count += 1
        self.stdout.write(self.style.SUCCESS(f'Processed {leave_count} leave requests.'))

        # 5. Payslips (uses FK to Employee)
        payslip_count = 0
        for p in data.get('payslips', []):
            PayrollEntry.objects.update_or_create(
                id=p['id'],
                defaults={
                    'employee_id': p.get('employeeId', ''),
                    'month': p.get('month', ''),
                    'year': p.get('year', 2026),
                    'pay_date': p.get('payDate'),
                    'base_salary': p.get('baseSalary', 0),
                    'allowances': p.get('allowances', {}),
                    'deductions': p.get('deductions', {}),
                    'gross_pay': p.get('grossPay', 0),
                    'total_deductions': p.get('totalDeductions', 0),
                    'net_pay': p.get('netPay', 0),
                    'status': p.get('status', 'Pending Approval'),
                    'reviewed_by': p.get('reviewedBy'),
                    'approved_at': p.get('approvedAt'),
                    'attendance_summary': p.get('attendanceSummary', {}),
                    'monthly_ctc': p.get('monthlyCTC', 0),
                }
            )
            payslip_count += 1
        self.stdout.write(self.style.SUCCESS(f'Processed {payslip_count} payroll entries.'))

        # 6. Announcements
        ann_count = 0
        for an in data.get('announcements', []):
            Announcement.objects.update_or_create(
                id=an['id'],
                defaults={
                    'title': an.get('title', ''),
                    'category': an.get('category', ''),
                    'priority': an.get('priority', 'Normal'),
                    'date': an.get('date'),
                    'author': an.get('author', ''),
                    'content': an.get('content', ''),
                }
            )
            ann_count += 1
        self.stdout.write(self.style.SUCCESS(f'Processed {ann_count} announcements.'))

        self.stdout.write(self.style.SUCCESS('Successfully loaded all seed data!'))
