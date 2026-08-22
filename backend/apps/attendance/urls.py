from django.urls import path
from apps.attendance.views import (
    CheckInView, CheckOutView, TodayAttendanceStatusView,
    EmployeeAttendanceView, AdminAttendanceView,
)

urlpatterns = [
    path("check-in/", CheckInView.as_view(), name="check_in"),
    path("check-out/", CheckOutView.as_view(), name="check_out"),
    path("today/", TodayAttendanceStatusView.as_view(), name="today_status"),
    path("my/", EmployeeAttendanceView.as_view(), name="employee_attendance"),
    path("all/", AdminAttendanceView.as_view(), name="admin_attendance"),
]
