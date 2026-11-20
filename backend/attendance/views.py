import re
from rest_framework import viewsets, permissions
from .models import AttendanceRecord
from .serializers import AttendanceRecordSerializer


def parse_time_to_minutes(time_str):
    if not time_str:
        return None
    time_str = str(time_str).strip()
    match = re.match(r'^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$', time_str, re.IGNORECASE)
    if not match:
        return None
    h = int(match.group(1))
    m = int(match.group(2))
    ampm = match.group(3).upper() if match.group(3) else None

    if ampm == 'PM' and h < 12:
        h += 12
    elif ampm == 'AM' and h == 12:
        h = 0
    return h * 60 + m


def calculate_worked_hours(clock_in, clock_out):
    if not clock_in or not clock_out:
        return 0.0
    in_min = parse_time_to_minutes(clock_in)
    out_min = parse_time_to_minutes(clock_out)
    if in_min is None or out_min is None:
        return 0.0
    diff = out_min - in_min
    if diff < 0:
        diff += 24 * 60
    return round(diff / 60.0, 1)


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    queryset = AttendanceRecord.objects.select_related('employee').all()
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        clock_in = serializer.validated_data.get('clock_in')
        clock_out = serializer.validated_data.get('clock_out')
        if clock_in and clock_out:
            hours = calculate_worked_hours(clock_in, clock_out)
            serializer.save(total_hours=hours)
        else:
            serializer.save()

    def perform_update(self, serializer):
        instance = serializer.instance
        clock_in = serializer.validated_data.get('clock_in', instance.clock_in)
        clock_out = serializer.validated_data.get('clock_out', instance.clock_out)
        if clock_in and clock_out:
            hours = calculate_worked_hours(clock_in, clock_out)
            serializer.save(total_hours=hours)
        else:
            serializer.save()
