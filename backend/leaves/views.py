from django.db import models
from rest_framework import viewsets, permissions
from .models import LeaveRequest
from .serializers import LeaveRequestSerializer
from notifications import push_notification
from authentication.models import User


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.select_related('employee').all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        instance = serializer.save()
        # Notify HR admins about new leave request
        hr_users = User.objects.filter(models.Q(role='hr') | models.Q(is_hr_admin=True))
        for hr_u in hr_users:
            if hr_u.id != getattr(self.request.user, 'id', None):
                push_notification(
                    user_id=hr_u.id,
                    event_type='leave_requested',
                    message=f"New {instance.leave_type} leave request from {instance.employee.name}",
                    data={'leave_id': instance.id, 'employee_name': instance.employee.name}
                )

    def perform_update(self, serializer):
        old_status = self.get_object().status
        instance = serializer.save()

        # Update leave balances when approved
        if old_status != 'Approved' and instance.status == 'Approved':
            emp = instance.employee
            if emp and emp.leave_balances:
                ltype = instance.leave_type.lower()
                balances = dict(emp.leave_balances)
                if ltype in balances:
                    info = dict(balances[ltype])
                    info['used'] = (info.get('used', 0) or 0) + instance.days
                    balances[ltype] = info
                    emp.leave_balances = balances
                    emp.save(update_fields=['leave_balances'])

        # Send live notification to the employee if status changed
        if old_status != instance.status and instance.status in ('Approved', 'Rejected'):
            emp = instance.employee
            target_user_id = emp.user_id if emp else None
            if not target_user_id and emp:
                u = User.objects.filter(employee_id=emp.id).first() or User.objects.filter(email=emp.email).first()
                if u:
                    target_user_id = u.id

            if target_user_id:
                push_notification(
                    user_id=target_user_id,
                    event_type=f'leave_{instance.status.lower()}',
                    message=f"Your {instance.leave_type} leave ({instance.start_date} to {instance.end_date}) has been {instance.status.lower()}.",
                    data={
                        'leave_id': instance.id,
                        'leave_type': instance.leave_type,
                        'status': instance.status,
                        'reviewed_by': instance.reviewed_by or '',
                    }
                )
