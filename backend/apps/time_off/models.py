from django.db import models
from apps.employees.models import Employee
from apps.authentication.models import User

class TimeOffType(models.TextChoices):
    PAID = 'PAID', 'Paid Time Off'
    SICK = 'SICK', 'Sick Leave'
    UNPAID = 'UNPAID', 'Unpaid Leave'

class TimeOffAllocation(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='time_off_allocations')
    time_off_type = models.CharField(max_length=20, choices=TimeOffType.choices)
    total_days = models.IntegerField(default=24)
    used_days = models.IntegerField(default=0)

    class Meta:
        unique_together = ('employee', 'time_off_type')

    @property
    def remaining_days(self):
        return max(0, self.total_days - self.used_days)

    def __str__(self):
        return f"{self.employee.name} - {self.time_off_type}: {self.remaining_days}/{self.total_days} left"

class TimeOffRequest(models.Model):
    class RequestStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending / To Approve'
        APPROVED = 'APPROVED', 'Validated / Approved'
        REJECTED = 'REJECTED', 'Refused / Rejected'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='time_off_requests')
    time_off_type = models.CharField(max_length=20, choices=TimeOffType.choices)
    start_date = models.DateField()
    end_date = models.DateField()
    days_count = models.IntegerField(default=1)
    reason = models.TextField(blank=True)
    attachment = models.FileField(upload_to='sick_certificates/', null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=RequestStatus.choices,
        default=RequestStatus.PENDING
    )
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_leaves')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.employee.name} ({self.time_off_type}) {self.start_date} to {self.end_date} - {self.status}"

class PublicHoliday(models.Model):
    name = models.CharField(max_length=150)
    date = models.DateField(unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.name} ({self.date})"
