from rest_framework import viewsets, permissions
from .models import LeaveRequest
from .serializers import LeaveRequestSerializer
from employees.models import Employee

class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.all()
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_update(self, serializer):
        old_status = self.get_object().status
        instance = serializer.save()
        if old_status != 'Approved' and instance.status == 'Approved':
            emp = Employee.objects.filter(id=instance.employee_id).first()
            if emp and emp.leave_balances:
                ltype = instance.leave_type.lower()
                balances = dict(emp.leave_balances)
                if ltype in balances:
                    info = dict(balances[ltype])
                    info['used'] = (info.get('used', 0) or 0) + instance.days
                    balances[ltype] = info
                    emp.leave_balances = balances
                    emp.save(update_fields=['leave_balances'])
