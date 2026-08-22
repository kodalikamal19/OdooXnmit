from django.urls import path
from apps.timeoff.views import (
    AllocationListView, TimeOffRequestListView, TimeOffRequestDetailView,
    EmployeeCalendarView, PublicHolidayView,
)

urlpatterns = [
    path("allocations/", AllocationListView.as_view(), name="allocations"),
    path("requests/", TimeOffRequestListView.as_view(), name="timeoff_requests"),
    path("requests/<str:request_id>/", TimeOffRequestDetailView.as_view(), name="timeoff_request_detail"),
    path("calendar/", EmployeeCalendarView.as_view(), name="employee_calendar"),
    path("holidays/", PublicHolidayView.as_view(), name="public_holidays"),
    path("holidays/<str:holiday_id>/", PublicHolidayView.as_view(), name="public_holiday_delete"),
]
