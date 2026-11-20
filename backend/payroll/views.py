from rest_framework import viewsets, permissions
from .models import PayrollEntry
from .serializers import PayrollEntrySerializer
from notifications import push_notification
from authentication.models import User


class PayrollEntryViewSet(viewsets.ModelViewSet):
    queryset = PayrollEntry.objects.select_related('employee').all()
    serializer_class = PayrollEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        old_status = self.get_object().status
        instance = serializer.save()

        # Send live notification when payslip status changes
        if old_status != instance.status and instance.status in ('Approved', 'Paid', 'Rejected'):
            emp = instance.employee
            target_user_id = emp.user_id if emp else None
            if not target_user_id and emp:
                u = User.objects.filter(employee_id=emp.id).first() or User.objects.filter(email=emp.email).first()
                if u:
                    target_user_id = u.id

            if target_user_id:
                push_notification(
                    user_id=target_user_id,
                    event_type=f'payslip_{instance.status.lower()}',
                    message=f"Your payslip for {instance.month} {instance.year} has been {instance.status.lower()}.",
                    data={
                        'payslip_id': instance.id,
                        'month': instance.month,
                        'year': instance.year,
                        'status': instance.status,
                        'net_pay': str(instance.net_pay),
                    }
                )
