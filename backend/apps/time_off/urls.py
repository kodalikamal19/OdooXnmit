from rest_framework.routers import DefaultRouter
from django.urls import path, include
from apps.time_off.views import TimeOffAllocationViewSet, TimeOffRequestViewSet, PublicHolidayViewSet

router = DefaultRouter()
router.register('allocations', TimeOffAllocationViewSet, basename='allocation')
router.register('requests', TimeOffRequestViewSet, basename='request')
router.register('holidays', PublicHolidayViewSet, basename='holiday')

urlpatterns = [
    path('', include(router.urls)),
]
