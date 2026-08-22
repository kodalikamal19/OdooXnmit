from django.db import models
from apps.employees.models import Employee

class AttendanceRecord(models.Model):
    class AttendanceStatus(models.TextChoices):
        PRESENT = 'PRESENT', 'Present'
        ABSENT = 'ABSENT', 'Absent'
        HALF_DAY = 'HALF_DAY', 'Half Day'
        ON_LEAVE = 'ON_LEAVE', 'On Leave'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    work_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    extra_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    break_hours = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    status = models.CharField(
        max_length=20,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.PRESENT
    )

    class Meta:
        unique_together = ('employee', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.employee.name} - {self.date} ({self.status})"
