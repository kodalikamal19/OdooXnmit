from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from datetime import date
from django.db.models import Q
from apps.time_off.models import TimeOffAllocation, TimeOffRequest, PublicHoliday, TimeOffType
from apps.time_off.serializers import TimeOffAllocationSerializer, TimeOffRequestSerializer, PublicHolidaySerializer
from apps.authentication.models import User
from apps.employees.models import Employee

class TimeOffAllocationViewSet(viewsets.ModelViewSet):
    serializer_class = TimeOffAllocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in [User.Role.ADMIN, User.Role.HR_OFFICER]:
            return TimeOffAllocation.objects.all().select_related('employee')
        employee = getattr(user, 'employee_profile', None)
        if employee:
            return TimeOffAllocation.objects.filter(employee=employee)
        return TimeOffAllocation.objects.none()

class TimeOffRequestViewSet(viewsets.ModelViewSet):
    serializer_class = TimeOffRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = TimeOffRequest.objects.all().select_related('employee')
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(employee__first_name__icontains=search) |
                Q(employee__last_name__icontains=search) |
                Q(employee__login_id__icontains=search) |
                Q(time_off_type__icontains=search)
            )

        if user.role in [User.Role.ADMIN, User.Role.HR_OFFICER]:
            return queryset
        
        employee = getattr(user, 'employee_profile', None)
        if employee:
            return queryset.filter(employee=employee)
        return TimeOffRequest.objects.none()

    def create(self, request, *args, **kwargs):
        user = request.user
        employee = getattr(user, 'employee_profile', None)
        if not employee:
            return Response({'error': 'Employee profile required to request time off.'}, status=status.HTTP_400_BAD_REQUEST)

        start_date_str = request.data.get('start_date')
        end_date_str = request.data.get('end_date')
        time_off_type = request.data.get('time_off_type')
        reason = request.data.get('reason', '')
        attachment = request.FILES.get('attachment')

        if not start_date_str or not end_date_str or not time_off_type:
            return Response({'error': 'Please provide Start Date, End Date, and Time Off Type.'}, status=status.HTTP_400_BAD_REQUEST)

        # Mandatory attachment check for Sick leave if required by policy
        if time_off_type == TimeOffType.SICK and not attachment:
            return Response({'attachment': 'Medical certification document is required for Sick Leave.'}, status=status.HTTP_400_BAD_REQUEST)

        start_date = date.fromisoformat(start_date_str)
        end_date = date.fromisoformat(end_date_str)

        if end_date < start_date:
            return Response({'end_date': 'End Date cannot be before Start Date.'}, status=status.HTTP_400_BAD_REQUEST)

        days_count = (end_date - start_date).days + 1

        # Check allocation limit
        alloc = TimeOffAllocation.objects.filter(employee=employee, time_off_type=time_off_type).first()
        if alloc and time_off_type != TimeOffType.UNPAID:
            if alloc.remaining_days < days_count:
                return Response({'error': f"Insufficient leave allocation. You have {alloc.remaining_days} days remaining for {time_off_type}."}, status=status.HTTP_400_BAD_REQUEST)

        leave_req = TimeOffRequest.objects.create(
            employee=employee,
            time_off_type=time_off_type,
            start_date=start_date,
            end_date=end_date,
            days_count=days_count,
            reason=reason,
            attachment=attachment,
            status=TimeOffRequest.RequestStatus.PENDING
        )

        return Response(TimeOffRequestSerializer(leave_req, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def approve(self, request, pk=None):
        user = request.user
        if user.role not in [User.Role.ADMIN, User.Role.HR_OFFICER]:
            return Response({'error': 'Only Admin or HR Officers can approve time off requests.'}, status=status.HTTP_403_FORBIDDEN)

        leave_req = self.get_object()
        if leave_req.status == TimeOffRequest.RequestStatus.APPROVED:
            return Response({'message': 'Request is already approved.'})

        leave_req.status = TimeOffRequest.RequestStatus.APPROVED
        leave_req.approved_by = user
        leave_req.save()

        # Update Allocation used days
        alloc = TimeOffAllocation.objects.filter(employee=leave_req.employee, time_off_type=leave_req.time_off_type).first()
        if alloc:
            alloc.used_days += leave_req.days_count
            alloc.save()

        # Update Employee status indicator if today is within leave period
        today = date.today()
        if leave_req.start_date <= today <= leave_req.end_date:
            leave_req.employee.status_indicator = Employee.StatusIndicator.ON_LEAVE
            leave_req.employee.save()

        return Response(TimeOffRequestSerializer(leave_req, context={'request': request}).data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def reject(self, request, pk=None):
        user = request.user
        if user.role not in [User.Role.ADMIN, User.Role.HR_OFFICER]:
            return Response({'error': 'Only Admin or HR Officers can reject time off requests.'}, status=status.HTTP_403_FORBIDDEN)

        leave_req = self.get_object()
        leave_req.status = TimeOffRequest.RequestStatus.REJECTED
        leave_req.approved_by = user
        leave_req.save()

        return Response(TimeOffRequestSerializer(leave_req, context={'request': request}).data)

class PublicHolidayViewSet(viewsets.ModelViewSet):
    serializer_class = PublicHolidaySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = PublicHoliday.objects.all()
