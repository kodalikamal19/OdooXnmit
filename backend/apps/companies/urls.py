from django.urls import path
from apps.companies.views import CompanyListView, CompanyUpdateView

urlpatterns = [
    path("", CompanyListView.as_view(), name="company_detail"),
    path("<str:company_id>/", CompanyUpdateView.as_view(), name="company_update"),
]
