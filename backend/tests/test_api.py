import json
from django.test import TestCase
from rest_framework.test import APIClient
from authentication.models import User
from employees.models import Employee
from attendance.models import AttendanceRecord
from leaves.models import LeaveRequest
from payroll.models import PayrollEntry
from announcements.models import Announcement

class HRMSApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            id='USR-TEST-001',
            email='test@hrms.com',
            password='testpassword123',
            role='hr',
            is_hr_admin=True
        )
        self.employee = Employee.objects.create(
            id='EMP-TEST-001',
            user=self.user,
            name='Test User',
            email='test@hrms.com',
            job_title='Tester',
            department='QA',
            role='hr',
            salary=50000
        )
        # Login and obtain token
        login_res = self.client.post('/api/auth/login/', {
            'email': 'test@hrms.com',
            'password': 'testpassword123'
        }, format='json')
        self.assertEqual(login_res.status_code, 200)
        token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

    def test_current_user(self):
        res = self.client.get('/api/auth/me/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['email'], 'test@hrms.com')

    def test_employees_endpoint(self):
        res = self.client.get('/api/employees/')
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 1)

    def test_create_and_fetch_attendance(self):
        att = AttendanceRecord.objects.create(
            id='ATT-TEST-001',
            employee_id='EMP-TEST-001',
            employee_name='Test User',
            date='2026-11-19',
            clock_in='09:00 AM',
            status='Present'
        )
        res = self.client.get('/api/attendance/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_create_and_fetch_leave(self):
        lv = LeaveRequest.objects.create(
            id='LV-TEST-001',
            employee_id='EMP-TEST-001',
            employee_name='Test User',
            leave_type='Annual',
            start_date='2026-11-20',
            end_date='2026-11-22',
            days=3
        )
        res = self.client.get('/api/leaves/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_create_and_fetch_payroll(self):
        py = PayrollEntry.objects.create(
            id='PS-TEST-001',
            employee_id='EMP-TEST-001',
            employee_name='Test User',
            month='November',
            year=2026,
            base_salary=50000,
            net_pay=50000
        )
        res = self.client.get('/api/payroll/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_create_and_fetch_announcement(self):
        an = Announcement.objects.create(
            id='ANN-TEST-001',
            title='Test Announcement',
            author='Test User',
            content='Testing announcements'
        )
        res = self.client.get('/api/announcements/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)

    def test_upload_avatar_file(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = SimpleUploadedFile('profile.jpg', b'dummy_image_data', content_type='image/jpeg')
        res = self.client.post('/api/employees/upload_avatar/', {'avatar': f}, format='multipart')
        self.assertEqual(res.status_code, 200)
        self.assertIn('avatar_url', res.data)
        self.assertTrue(res.data['avatar_url'].startswith('/media/avatars/'))

    def test_update_employee_avatar(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = SimpleUploadedFile('avatar.png', b'dummy_avatar_png', content_type='image/png')
        res = self.client.post(f'/api/employees/{self.employee.id}/update_avatar/', {'avatar': f}, format='multipart')
        self.assertEqual(res.status_code, 200)
        self.assertIn('avatar', res.data)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.avatar, res.data['avatar'])

    def test_update_employee_fields(self):
        res = self.client.patch(f'/api/employees/{self.employee.id}/', {
            'phone': '+91 9988776655',
            'location': 'Mumbai Office',
            'avatar': 'https://example.com/photo.jpg'
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.phone, '+91 9988776655')
        self.assertEqual(self.employee.location, 'Mumbai Office')
        self.assertEqual(self.employee.avatar, 'https://example.com/photo.jpg')
