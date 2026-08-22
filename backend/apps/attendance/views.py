from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from datetime import date, datetime, timedelta
import calendar
from decimal import Decimal
from apps.attendance.models import AttendanceRecord
from apps.attendance.serializers import AttendanceRecordSerializer
from apps.employees.models import Employee
from apps.time_off.models import TimeOffRequest, TimeOffType, PublicHoliday
from apps.authentication.models import User

class CheckInCheckOutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        employee = getattr(user, 'employee_profile', None)
        if not employee:
            return Response({'is_checked_in': False, 'status': 'ABSENT'})

        today = timezone.now().date()
        record = AttendanceRecord.objects.filter(employee=employee, date=today).first()
        is_checked_in = bool(record and record.check_in and not record.check_out)
        
        return Response({
            'is_checked_in': is_checked_in,
            'attendance_status': employee.status_indicator,
            'today_record': AttendanceRecordSerializer(record, context={'request': request}).data if record else None
        })

    def post(self, request):
        user = request.user
        employee = getattr(user, 'employee_profile', None)
        if not employee:
            return Response({'error': 'Employee profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        today = now.date()

        record, created = AttendanceRecord.objects.get_or_create(
            employee=employee,
            date=today,
            defaults={
                'status': AttendanceRecord.AttendanceStatus.PRESENT,
                'break_hours': Decimal('1.00')
            }
        )

        if record.check_in and not record.check_out:
            # Employee is performing CHECK-OUT
            record.check_out = now
            duration_hrs = (now - record.check_in).total_seconds() / 3600.0
            actual_work = max(0.0, duration_hrs - float(record.break_hours))
            record.work_hours = Decimal(f"{actual_work:.2f}")
            
            # Calculate extra hours (standard work day is 8 hrs)
            if actual_work > 8.0:
                record.extra_hours = Decimal(f"{(actual_work - 8.0):.2f}")
            else:
                record.extra_hours = Decimal('0.00')
            
            record.save()
            employee.status_indicator = Employee.StatusIndicator.ABSENT
            employee.save()
            is_checked_in = False
        else:
            # Employee is performing CHECK-IN
            record.check_in = now
            record.check_out = None
            record.status = AttendanceRecord.AttendanceStatus.PRESENT
            record.save()
            employee.status_indicator = Employee.StatusIndicator.PRESENT
            employee.save()
            is_checked_in = True

        return Response({
            'is_checked_in': is_checked_in,
            'attendance_status': employee.status_indicator,
            'record': AttendanceRecordSerializer(record, context={'request': request}).data
        })

class MyAttendanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        employee = getattr(user, 'employee_profile', None)
        if not employee:
            return Response({'error': 'Employee profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        year = int(request.query_params.get('year', now.year))
        month = int(request.query_params.get('month', now.month))

        num_days = calendar.monthrange(year, month)[1]
        start_date = date(year, month, 1)
        end_date = date(year, month, num_days)

        records = AttendanceRecord.objects.filter(
            employee=employee,
            date__range=[start_date, end_date]
        ).order_by('date')

        record_map = {r.date: r for r in records}

        # Calculate statistics
        total_working_days = 0
        present_count = 0
        leave_count = 0
        unpaid_leave_count = 0

        # Fetch approved leaves in this month
        leaves = TimeOffRequest.objects.filter(
            employee=employee,
            status=TimeOffRequest.RequestStatus.APPROVED,
            start_date__lte=end_date,
            end_date__gte=start_date
        )

        leave_dates = set()
        unpaid_dates = set()
        for l in leaves:
            cur = l.start_date
            while cur <= l.end_date:
                if start_date <= cur <= end_date:
                    leave_dates.add(cur)
                    if l.time_off_type == TimeOffType.UNPAID:
                        unpaid_dates.add(cur)
                cur += timedelta(days=1)

        full_table = []
        for d in range(1, num_days + 1):
            cur_date = date(year, month, d)
            is_weekend = cur_date.weekday() in [5, 6]  # Saturday/Sunday
            
            if not is_weekend:
                total_working_days += 1

            rec = record_map.get(cur_date)
            if rec and rec.status == AttendanceRecord.AttendanceStatus.PRESENT:
                present_count += 1
                full_table.append(AttendanceRecordSerializer(rec, context={'request': request}).data)
            elif cur_date in leave_dates:
                leave_count += 1
                if cur_date in unpaid_dates:
                    unpaid_leave_count += 1
                full_table.append({
                    'id': f"leave-{cur_date}",
                    'date': cur_date.isoformat(),
                    'check_in': None,
                    'check_out': None,
                    'work_hours': '0.00',
                    'extra_hours': '0.00',
                    'status': 'ON_LEAVE'
                })
            else:
                if rec:
                    full_table.append(AttendanceRecordSerializer(rec, context={'request': request}).data)
                elif not is_weekend and cur_date <= date.today():
                    full_table.append({
                        'id': f"absent-{cur_date}",
                        'date': cur_date.isoformat(),
                        'check_in': None,
                        'check_out': None,
                        'work_hours': '0.00',
                        'extra_hours': '0.00',
                        'status': 'ABSENT'
                    })

        # Formula: Payable days = Working days - unpaid leaves - missing days
        missing_days = max(0, total_working_days - present_count - leave_count)
        payable_days = max(0, total_working_days - unpaid_leave_count - missing_days)

        return Response({
            'year': year,
            'month': month,
            'present_count': present_count,
            'leave_count': leave_count,
            'total_working_days': total_working_days,
            'payable_days': payable_days,
            'records': full_table
        })

class AdminAttendanceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in [User.Role.ADMIN, User.Role.HR_OFFICER]:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        date_str = request.query_params.get('date', timezone.now().date().isoformat())
        search = request.query_params.get('search', '').strip()

        try:
            selected_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            selected_date = timezone.now().date()

        employees = Employee.objects.all().select_related('department', 'user')
        if search:
            employees = employees.filter(
                first_name__icontains=search
            ) | employees.filter(
                last_name__icontains=search
            ) | employees.filter(
                login_id__icontains=search
            )

        records = AttendanceRecord.objects.filter(
            date=selected_date,
            employee__in=employees
        ).select_related('employee')
        
        record_map = {r.employee_id: r for r in records}

        # Check leaves on selected date
        on_leave_employees = TimeOffRequest.objects.filter(
            status=TimeOffRequest.RequestStatus.APPROVED,
            start_date__lte=selected_date,
            end_date__gte=selected_date
        ).values_list('employee_id', flat=True)

        list_data = []
        for emp in employees:
            rec = record_map.get(emp.id)
            if rec:
                list_data.append(AttendanceRecordSerializer(rec, context={'request': request}).data)
            else:
                emp_status = 'ON_LEAVE' if emp.id in on_leave_employees else 'ABSENT'
                list_data.append({
                    'id': f"emp-{emp.id}",
                    'employee': emp.id,
                    'employee_name': emp.name,
                    'employee_login_id': emp.login_id,
                    'job_position': emp.job_position,
                    'profile_picture': request.build_absolute_uri(emp.profile_picture.url) if emp.profile_picture else None,
                    'date': selected_date.isoformat(),
                    'check_in': None,
                    'check_out': None,
                    'work_hours': '0.00',
                    'extra_hours': '0.00',
                    'status': emp_status
                })

        return Response({
            'date': selected_date.isoformat(),
            'records': list_data
        })
