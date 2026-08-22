from django.urls import path
from apps.payroll.views import SalaryInfoView, PayableCalculationView

urlpatterns = [
    path("<str:employee_id>/salary/", SalaryInfoView.as_view(), name="salary_info"),
    path("<str:employee_id>/payable/", PayableCalculationView.as_view(), name="payable_calc"),
]
