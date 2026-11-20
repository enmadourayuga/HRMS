import re
from rest_framework import serializers
from .models import Employee
from authentication.models import User

class EmployeeSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=6, allow_blank=False)

    class Meta:
        model = Employee
        fields = '__all__'
        extra_kwargs = {
            'name': {'required': True, 'allow_blank': False},
            'email': {'required': True, 'allow_blank': False},
            'job_title': {'required': True, 'allow_blank': False},
            'department': {'required': True, 'allow_blank': False},
            'role': {'required': True, 'allow_blank': False},
            'phone': {'required': True, 'allow_blank': False},
            'location': {'required': True, 'allow_blank': False},
            'join_date': {'required': True, 'allow_null': False},
            'salary': {'required': True},
        }

    def validate_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Full name is required and cannot be blank.")
        return str(value).strip()

    def validate_email(self, value):
        val = str(value).strip().lower()
        if not val:
            raise serializers.ValidationError("Email is required.")
        qs = Employee.objects.filter(email__iexact=val)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("An employee with this email already exists.")
        return val

    def validate_job_title(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Job title is required and cannot be blank.")
        return str(value).strip()

    def validate_department(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Department is required and cannot be blank.")
        return str(value).strip()

    def validate_phone(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Phone number is required.")
        cleaned = re.sub(r'[\s\-\(\)\+]', '', str(value).strip())
        if len(cleaned) < 7:
            raise serializers.ValidationError("Please provide a valid phone number (at least 7 digits).")
        return str(value).strip()

    def validate_location(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Location is required and cannot be blank.")
        return str(value).strip()

    def validate_salary(self, value):
        if value is None or int(value) <= 0:
            raise serializers.ValidationError("Annual salary must be a positive number greater than 0.")
        return int(value)

    def validate_join_date(self, value):
        if not value:
            raise serializers.ValidationError("Joining date is required.")
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
            is_admin = getattr(user, 'is_hr_admin', False) or getattr(user, 'is_superuser', False)
            is_hr = getattr(user, 'role', '') == 'hr' or is_admin

            if 'avatar' in attrs and not is_hr:
                if self.instance and attrs.get('avatar') != self.instance.avatar:
                    raise serializers.ValidationError({"avatar": "Only HR administrators can change profile pictures for employees."})
                elif not self.instance and attrs.get('avatar'):
                    raise serializers.ValidationError({"avatar": "Only HR administrators can change profile pictures for employees."})

            target_role = attrs.get('role', getattr(self.instance, 'role', 'employee') if self.instance else 'employee')
            target_is_hr_admin = attrs.get('is_hr_admin', getattr(self.instance, 'is_hr_admin', False) if self.instance else False)
            is_target_hr = (target_role == 'hr') or bool(target_is_hr_admin)

            if not self.instance:
                # Creating new employee/account
                if not is_hr:
                    raise serializers.ValidationError({"detail": "You do not have permission to create employees."})
                if is_target_hr and not is_admin:
                    raise serializers.ValidationError({"role": "Only HR administrators can create new HR accounts."})
            else:
                # Updating existing employee
                old_role = getattr(self.instance, 'role', 'employee')
                old_is_hr_admin = getattr(self.instance, 'is_hr_admin', False)
                if ((target_role == 'hr' and old_role != 'hr') or (target_is_hr_admin and not old_is_hr_admin)) and not is_admin:
                    raise serializers.ValidationError({"role": "Only HR administrators can assign HR roles or privileges."})

        return super().validate(attrs)

    def create(self, validated_data):
        password = validated_data.pop('password', None) or 'password123'
        role = validated_data.get('role', 'employee')
        if 'is_hr_admin' in validated_data:
            is_hr_admin = bool(validated_data['is_hr_admin'])
        else:
            is_hr_admin = (role == 'hr')
        validated_data['is_hr_admin'] = is_hr_admin

        # Auto-generate ID if missing
        emp_id = validated_data.get('id')
        if not emp_id:
            existing_ids = Employee.objects.values_list('id', flat=True)
            max_num = 0
            for eid in existing_ids:
                m = re.search(r'(\d+)', eid)
                if m:
                    max_num = max(max_num, int(m.group(1)))
            emp_id = f"EMP-{max_num + 1:03d}"
            validated_data['id'] = emp_id

        # Assign salary structure if not provided
        if not validated_data.get('salary_structure_id'):
            validated_data['salary_structure_id'] = 'STR-002' if is_hr_admin else 'STR-001'

        # Assign default leave balances if not provided
        if not validated_data.get('leave_balances'):
            validated_data['leave_balances'] = {
                'annual': {'total': 20, 'used': 0},
                'sick': {'total': 10, 'used': 0},
                'casual': {'total': 5, 'used': 0}
            }

        if not validated_data.get('biometric_ref') and emp_id:
            validated_data['biometric_ref'] = f"BIO-{emp_id}"

        # Create or link associated User account
        email = validated_data.get('email')
        user = validated_data.get('user')
        if not user and email:
            existing_user = User.objects.filter(email__iexact=email).first()
            if existing_user:
                user = existing_user
                user.role = role
                user.is_hr_admin = is_hr_admin
                user.employee_id = emp_id
                user.is_staff = is_hr_admin
                if password:
                    user.set_password(password)
                user.save()
            else:
                user_prefix = 'HR' if is_hr_admin else 'EMP'
                m = re.search(r'(\d+)', emp_id)
                numeric_part = m.group(1) if m else '001'
                user_id = f"USR-{user_prefix}-{numeric_part}"
                counter = 1
                candidate_uid = user_id
                while User.objects.filter(id=candidate_uid).exists():
                    candidate_uid = f"{user_id}-{counter}"
                    counter += 1

                user = User.objects.create_user(
                    id=candidate_uid,
                    email=email,
                    password=password,
                    role=role,
                    is_hr_admin=is_hr_admin,
                    employee_id=emp_id,
                    is_staff=is_hr_admin
                )
            validated_data['user'] = user

        return super().create(validated_data)

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        user = instance.user or User.objects.filter(employee_id=instance.id).first() or User.objects.filter(email=instance.email).first()
        if user:
            updated_fields = []
            if 'role' in validated_data:
                user.role = validated_data['role']
                updated_fields.append('role')
            if 'is_hr_admin' in validated_data:
                user.is_hr_admin = validated_data['is_hr_admin']
                user.is_staff = validated_data['is_hr_admin']
                updated_fields.extend(['is_hr_admin', 'is_staff'])
            if 'email' in validated_data:
                user.email = validated_data['email']
                updated_fields.append('email')
            if 'status' in validated_data:
                user.is_active = (validated_data['status'] == 'Active')
                updated_fields.append('is_active')
            if updated_fields:
                user.save(update_fields=list(set(updated_fields)))
        return instance

