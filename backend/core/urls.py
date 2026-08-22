"""Root URL configuration."""
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include

urlpatterns = [
    path("api/auth/", include("apps.authentication.urls")),
    path("api/companies/", include("apps.companies.urls")),
    path("api/employees/", include("apps.employees.urls")),
    path("api/attendance/", include("apps.attendance.urls")),
    path("api/timeoff/", include("apps.timeoff.urls")),
    path("api/payroll/", include("apps.payroll.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
