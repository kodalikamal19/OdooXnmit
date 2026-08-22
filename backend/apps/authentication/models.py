from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        HR_OFFICER = 'HR_OFFICER', 'HR Officer'
        EMPLOYEE = 'EMPLOYEE', 'Employee'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.EMPLOYEE
    )
    is_initial_password = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"
