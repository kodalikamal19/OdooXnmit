from django.urls import path
from apps.employees.views import (
    EmployeeListView, EmployeeDetailView,
    EmployeeSkillsView, EmployeeCertificationsView,
    MyEmployeeProfileView,
)

urlpatterns = [
    path("", EmployeeListView.as_view(), name="employee_list"),
    path("me/", MyEmployeeProfileView.as_view(), name="my_employee_profile"),
    path("<str:employee_id>/", EmployeeDetailView.as_view(), name="employee_detail"),
    path("<str:employee_id>/skills/", EmployeeSkillsView.as_view(), name="employee_skills"),
    path("<str:employee_id>/certifications/", EmployeeCertificationsView.as_view(), name="employee_certs"),
]
