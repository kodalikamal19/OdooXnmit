from django.urls import path
from apps.attendance.views import CheckInCheckOutView, MyAttendanceView, AdminAttendanceView

urlpatterns = [
    path('toggle-checkin/', CheckInCheckOutView.as_view(), name='toggle-checkin'),
    path('my-attendance/', MyAttendanceView.as_view(), name='my-attendance'),
    path('admin-attendance/', AdminAttendanceView.as_view(), name='admin-attendance'),
]
