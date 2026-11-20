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
            employee=self.employee,
            date='2026-11-19',
            clock_in='09:00 AM',
            status='Present'
        )
        res = self.client.get('/api/attendance/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        # Verify FK-derived fields appear in API response
        self.assertEqual(res.data[0]['employee_id'], 'EMP-TEST-001')
        self.assertEqual(res.data[0]['employee_name'], 'Test User')

    def test_create_attendance_via_api(self):
        """Frontend sends employee_id as a string — verify backward compat."""
        res = self.client.post('/api/attendance/', {
            'id': 'ATT-TEST-002',
            'employee_id': self.employee.id,
            'date': '2026-11-20',
            'clock_in': '09:00 AM',
            'clock_out': '06:00 PM',
            'status': 'Present',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['employee_name'], 'Test User')

    def test_create_and_fetch_leave(self):
        lv = LeaveRequest.objects.create(
            id='LV-TEST-001',
            employee=self.employee,
            leave_type='Annual',
            start_date='2026-11-20',
            end_date='2026-11-22',
            days=3
        )
        res = self.client.get('/api/leaves/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['employee_id'], 'EMP-TEST-001')
        self.assertEqual(res.data[0]['employee_name'], 'Test User')

    def test_create_and_fetch_payroll(self):
        py = PayrollEntry.objects.create(
            id='PS-TEST-001',
            employee=self.employee,
            month='November',
            year=2026,
            base_salary=50000,
            net_pay=50000
        )
        res = self.client.get('/api/payroll/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['employee_id'], 'EMP-TEST-001')
        self.assertEqual(res.data[0]['employee_name'], 'Test User')

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
        self.assertTrue('/media/avatars/' in res.data['avatar_url'])

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

    def test_notifications_endpoints_and_trigger(self):
        # Test poll endpoint
        res = self.client.get('/api/notifications/poll/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data, [])

        # Trigger notification by updating a leave status to Approved
        lv = LeaveRequest.objects.create(
            id='LV-NOTIF-01',
            employee=self.employee,
            leave_type='Sick',
            start_date='2026-11-21',
            end_date='2026-11-22',
            days=2,
            status='Pending'
        )
        patch_res = self.client.patch(f'/api/leaves/{lv.id}/', {
            'status': 'Approved',
            'reviewed_by': 'hr@hrms.com'
        }, format='json')
        self.assertEqual(patch_res.status_code, 200)

        # Employee should have received an approval notification
        poll_res = self.client.get('/api/notifications/poll/')
        self.assertEqual(poll_res.status_code, 200)
        self.assertEqual(len(poll_res.data), 1)
        self.assertEqual(poll_res.data[0]['type'], 'leave_approved')
        self.assertIn('approved', poll_res.data[0]['message'].lower())

    def test_create_employee_missing_required_fields_fails(self):
        # Missing required fields should return 400 Bad Request
        res = self.client.post('/api/employees/', {
            'name': '   ',  # whitespace only
            'email': '',
            'job_title': '',
            'department': '',
            'role': '',
            'salary': 0,
            'phone': '',
            'location': '',
            'join_date': ''
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertIn('name', res.data)
        self.assertIn('email', res.data)
        self.assertIn('job_title', res.data)
        self.assertIn('department', res.data)
        self.assertIn('salary', res.data)
        self.assertIn('phone', res.data)
        self.assertIn('location', res.data)

    def test_create_employee_success_and_creates_user(self):
        payload = {
            'id': 'EMP-TEST-900',
            'name': 'Jane Developer',
            'email': 'jane.dev@hrms.com',
            'password': 'custompassword123',
            'job_title': 'Frontend Engineer',
            'department': 'Engineering',
            'role': 'employee',
            'salary': 1500000,
            'phone': '+91 91234 56789',
            'location': 'Bengaluru (HQ)',
            'join_date': '2026-11-20',
            'employment_type': 'Full-Time'
        }
        res = self.client.post('/api/employees/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['name'], 'Jane Developer')
        self.assertEqual(res.data['is_hr_admin'], False)

        # Verify user account was created and can authenticate
        user = User.objects.filter(email='jane.dev@hrms.com').first()
        self.assertIsNotNone(user)
        self.assertEqual(user.role, 'employee')
        self.assertEqual(user.is_hr_admin, False)
        self.assertTrue(user.check_password('custompassword123'))

        # Verify login endpoint accepts new employee credentials
        login_res = self.client.post('/api/auth/login/', {
            'email': 'jane.dev@hrms.com',
            'password': 'custompassword123'
        }, format='json')
        self.assertEqual(login_res.status_code, 200)

    def test_create_hr_admin_success_sets_is_hr_admin(self):
        payload = {
            'id': 'EMP-TEST-901',
            'name': 'HR Manager',
            'email': 'hrmanager@hrms.com',
            'password': 'securehrpass123',
            'job_title': 'HR Lead',
            'department': 'Human Resources',
            'role': 'hr',
            'salary': 2000000,
            'phone': '+91 99887 76655',
            'location': 'Mumbai Office',
            'join_date': '2026-11-20',
            'employment_type': 'Full-Time'
        }
        res = self.client.post('/api/employees/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['is_hr_admin'])

        user = User.objects.filter(email='hrmanager@hrms.com').first()
        self.assertIsNotNone(user)
        self.assertEqual(user.role, 'hr')
        self.assertTrue(user.is_hr_admin)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.check_password('securehrpass123'))

    def test_hr_can_deactivate_and_reactivate_employee(self):
        # Create an active employee
        user = User.objects.create_user(
            id='USR-TEST-EMP50',
            email='active.worker@hrms.com',
            password='workerpass123',
            role='employee',
            employee_id='EMP-TEST-050'
        )
        emp = Employee.objects.create(
            id='EMP-TEST-050',
            user=user,
            name='Active Worker',
            email='active.worker@hrms.com',
            job_title='Staff',
            department='Engineering',
            role='employee',
            salary=600000,
            status='Active'
        )

        # 1. Deactivate employee account as HR
        res = self.client.post(f'/api/employees/{emp.id}/toggle_status/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'Inactive')
        self.assertEqual(res.data['is_active'], False)

        emp.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(emp.status, 'Inactive')
        self.assertEqual(user.is_active, False)

        # 2. Deactivated user should not be able to log in
        login_res = self.client.post('/api/auth/login/', {
            'email': 'active.worker@hrms.com',
            'password': 'workerpass123'
        }, format='json')
        self.assertEqual(login_res.status_code, 401)

        # 3. Reactivate employee account as HR
        res = self.client.post(f'/api/employees/{emp.id}/toggle_status/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'Active')
        self.assertEqual(res.data['is_active'], True)

        emp.refresh_from_db()
        user.refresh_from_db()
        self.assertEqual(emp.status, 'Active')
        self.assertEqual(user.is_active, True)

        # 4. Reactivated user can log in again
        login_res2 = self.client.post('/api/auth/login/', {
            'email': 'active.worker@hrms.com',
            'password': 'workerpass123'
        }, format='json')
        self.assertEqual(login_res2.status_code, 200)

    def test_hr_cannot_deactivate_self(self):
        # self.employee is linked to logged-in HR self.user
        res = self.client.post(f'/api/employees/{self.employee.id}/toggle_status/')
        self.assertEqual(res.status_code, 400)
        self.assertIn('cannot deactivate your own', res.data['error'].lower())

    def test_non_hr_cannot_deactivate_employee(self):
        # Log in as normal employee
        emp_user = User.objects.create_user(
            id='USR-NORMAL-EMP',
            email='regular@hrms.com',
            password='regpass123',
            role='employee',
            is_hr_admin=False
        )
        login_res = self.client.post('/api/auth/login/', {
            'email': 'regular@hrms.com',
            'password': 'regpass123'
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_res.data['access'])

        res = self.client.post(f'/api/employees/{self.employee.id}/toggle_status/')
        self.assertEqual(res.status_code, 403)

    def test_hr_can_change_avatar_via_patch(self):
        new_avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop'
        res = self.client.patch(f'/api/employees/{self.employee.id}/', {
            'avatar': new_avatar
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['avatar'], new_avatar)

    def test_non_hr_cannot_change_avatar_via_patch(self):
        emp_user = User.objects.create_user(
            id='USR-NORMAL-EMP2',
            email='regular2@hrms.com',
            password='regpass123',
            role='employee',
            is_hr_admin=False
        )
        emp = Employee.objects.create(
            id='EMP-TEST-002',
            user=emp_user,
            name='Regular Employee',
            email='regular2@hrms.com',
            job_title='Developer',
            department='Engineering',
            role='employee',
            salary=70000,
            avatar='https://example.com/original.png'
        )
        login_res = self.client.post('/api/auth/login/', {
            'email': 'regular2@hrms.com',
            'password': 'regpass123'
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_res.data['access'])

        res = self.client.patch(f'/api/employees/{emp.id}/', {
            'avatar': 'https://example.com/hacked.png'
        }, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertIn('Only HR administrators can change profile pictures', res.data['error'])

    def test_non_hr_cannot_upload_avatar(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        emp_user = User.objects.create_user(
            id='USR-NORMAL-EMP3',
            email='regular3@hrms.com',
            password='regpass123',
            role='employee',
            is_hr_admin=False
        )
        login_res = self.client.post('/api/auth/login/', {
            'email': 'regular3@hrms.com',
            'password': 'regpass123'
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_res.data['access'])

        fake_img = SimpleUploadedFile("avatar.png", b"fake image content", content_type="image/png")
        res = self.client.post('/api/employees/upload_avatar/', {'avatar': fake_img}, format='multipart')
        self.assertEqual(res.status_code, 403)
        self.assertIn('Only HR administrators can change profile pictures', res.data['error'])

    def test_non_hr_cannot_call_update_avatar_action(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        emp_user = User.objects.create_user(
            id='USR-NORMAL-EMP4',
            email='regular4@hrms.com',
            password='regpass123',
            role='employee',
            is_hr_admin=False
        )
        login_res = self.client.post('/api/auth/login/', {
            'email': 'regular4@hrms.com',
            'password': 'regpass123'
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_res.data['access'])

        fake_img = SimpleUploadedFile("avatar.png", b"fake image content", content_type="image/png")
        res = self.client.post(f'/api/employees/{self.employee.id}/update_avatar/', {'avatar': fake_img}, format='multipart')
        self.assertEqual(res.status_code, 403)
        self.assertIn('Only HR administrators can change profile pictures', res.data['error'])

    def test_non_hr_cannot_update_contact_info(self):
        emp_user = User.objects.create_user(
            id='USR-NORMAL-EMP5',
            email='regular5@hrms.com',
            password='regpass123',
            role='employee',
            employee_id='EMP-TEST-005',
            is_hr_admin=False
        )
        emp = Employee.objects.create(
            id='EMP-TEST-005',
            user=emp_user,
            name='Regular Contact',
            email='regular5@hrms.com',
            job_title='Designer',
            department='Design',
            role='employee',
            salary=60000,
            join_date='2024-01-15',
            phone='1234567890',
            location='Delhi'
        )
        login_res = self.client.post('/api/auth/login/', {
            'email': 'regular5@hrms.com',
            'password': 'regpass123'
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_res.data['access'])

        res = self.client.patch(f'/api/employees/{emp.id}/', {
            'phone': '9876543210',
            'location': 'Bengaluru (HQ)'
        }, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertIn('Employees are not allowed to edit their information', res.data.get('detail', ''))

    def test_other_hr_cannot_create_hr_account(self):
        # Create an HR user who is NOT an HR admin
        other_hr_user = User.objects.create_user(
            id='USR-OTHER-HR-01',
            email='clara.test@hrms.com',
            password='clarapass123',
            role='hr',
            is_hr_admin=False
        )
        Employee.objects.create(
            id='EMP-OTHER-HR-01',
            user=other_hr_user,
            name='Clara Test',
            email='clara.test@hrms.com',
            job_title='HR Operations Specialist',
            department='Human Resources',
            role='hr',
            salary=700000,
            is_hr_admin=False
        )

        login_res = self.client.post('/api/auth/login/', {
            'email': 'clara.test@hrms.com',
            'password': 'clarapass123'
        }, format='json')
        self.assertEqual(login_res.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_res.data['access'])

        # Attempt to create an HR account with role='hr'
        payload = {
            'id': 'EMP-TEST-HR99',
            'name': 'Unauthorized HR',
            'email': 'unauth.hr@hrms.com',
            'password': 'password123',
            'job_title': 'HR Specialist',
            'department': 'Human Resources',
            'role': 'hr',
            'salary': 800000,
            'phone': '+91 99999 88888',
            'location': 'Bengaluru (HQ)',
            'join_date': '2026-11-20',
            'employment_type': 'Full-Time'
        }
        res = self.client.post('/api/employees/', payload, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertIn('Only HR administrators can create new HR accounts', str(res.data))
        self.assertFalse(User.objects.filter(email='unauth.hr@hrms.com').exists())

        # Attempt to create an account with is_hr_admin=True
        payload2 = {
            'id': 'EMP-TEST-HR98',
            'name': 'Unauthorized Admin',
            'email': 'unauth.admin@hrms.com',
            'password': 'password123',
            'job_title': 'Admin',
            'department': 'Engineering',
            'role': 'employee',
            'is_hr_admin': True,
            'salary': 800000,
            'phone': '+91 99999 88888',
            'location': 'Bengaluru (HQ)',
            'join_date': '2026-11-20',
            'employment_type': 'Full-Time'
        }
        res2 = self.client.post('/api/employees/', payload2, format='json')
        self.assertEqual(res2.status_code, 403)
        self.assertFalse(User.objects.filter(email='unauth.admin@hrms.com').exists())

    def test_other_hr_can_create_normal_employee(self):
        # Create an HR user who is NOT an HR admin
        other_hr_user = User.objects.create_user(
            id='USR-OTHER-HR-02',
            email='clara2.test@hrms.com',
            password='clarapass123',
            role='hr',
            is_hr_admin=False
        )
        Employee.objects.create(
            id='EMP-OTHER-HR-02',
            user=other_hr_user,
            name='Clara Two',
            email='clara2.test@hrms.com',
            job_title='HR Operations Specialist',
            department='Human Resources',
            role='hr',
            salary=700000,
            is_hr_admin=False
        )

        login_res = self.client.post('/api/auth/login/', {
            'email': 'clara2.test@hrms.com',
            'password': 'clarapass123'
        }, format='json')
        self.assertEqual(login_res.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_res.data['access'])

        # Other HR CAN create normal employee
        payload = {
            'id': 'EMP-NORMAL-101',
            'name': 'Normal Staff Member',
            'email': 'normal.staff@hrms.com',
            'password': 'password123',
            'job_title': 'Junior Developer',
            'department': 'Engineering',
            'role': 'employee',
            'salary': 600000,
            'phone': '+91 88888 77777',
            'location': 'Bengaluru (HQ)',
            'join_date': '2026-11-20',
            'employment_type': 'Full-Time'
        }
        res = self.client.post('/api/employees/', payload, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['name'], 'Normal Staff Member')
        self.assertEqual(res.data['role'], 'employee')
        self.assertFalse(res.data['is_hr_admin'])

        user = User.objects.filter(email='normal.staff@hrms.com').first()
        self.assertIsNotNone(user)
        self.assertEqual(user.role, 'employee')
        self.assertFalse(user.is_hr_admin)

    def test_other_hr_cannot_promote_to_hr_via_update(self):
        # Create normal employee
        emp = Employee.objects.create(
            id='EMP-TEST-PROMOTE',
            name='Worker To Promote',
            email='promote.target@hrms.com',
            job_title='Developer',
            department='Engineering',
            role='employee',
            salary=500000,
            is_hr_admin=False
        )
        # Login as non-admin HR
        other_hr_user = User.objects.create_user(
            id='USR-OTHER-HR-03',
            email='clara3.test@hrms.com',
            password='clarapass123',
            role='hr',
            is_hr_admin=False
        )
        login_res = self.client.post('/api/auth/login/', {
            'email': 'clara3.test@hrms.com',
            'password': 'clarapass123'
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_res.data['access'])

        res = self.client.patch(f'/api/employees/{emp.id}/', {'role': 'hr'}, format='json')
        self.assertEqual(res.status_code, 403)

        res2 = self.client.patch(f'/api/employees/{emp.id}/', {'is_hr_admin': True}, format='json')
        self.assertEqual(res2.status_code, 403)

    def test_standard_employee_cannot_create_employee(self):
        # Create normal employee
        emp_user = User.objects.create_user(
            id='USR-NORMAL-EMP99',
            email='dev99@hrms.com',
            password='devpassword123',
            role='employee',
            is_hr_admin=False
        )
        login_res = self.client.post('/api/auth/login/', {
            'email': 'dev99@hrms.com',
            'password': 'devpassword123'
        }, format='json')
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + login_res.data['access'])

        payload = {
            'id': 'EMP-TEST-FAIL',
            'name': 'Should Fail',
            'email': 'fail@hrms.com',
            'password': 'password123',
            'job_title': 'Staff',
            'department': 'Engineering',
            'role': 'employee',
            'salary': 500000,
            'phone': '+91 88888 77777',
            'location': 'Bengaluru (HQ)',
            'join_date': '2026-11-20',
            'employment_type': 'Full-Time'
        }
        res = self.client.post('/api/employees/', payload, format='json')
        self.assertEqual(res.status_code, 403)




