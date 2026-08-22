from rest_framework.routers import DefaultRouter
from django.urls import path, include
from apps.employees.views import (
    EmployeeViewSet, SkillViewSet, CertificationViewSet, 
    ResumeItemViewSet, DepartmentViewSet
)

router = DefaultRouter()
router.register('employees', EmployeeViewSet, basename='employee')
router.register('skills', SkillViewSet, basename='skill')
router.register('certifications', CertificationViewSet, basename='certification')
router.register('resume-items', ResumeItemViewSet, basename='resume-item')
router.register('departments', DepartmentViewSet, basename='department')

urlpatterns = [
    path('', include(router.urls)),
]
