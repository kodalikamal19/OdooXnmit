from django.db import models
from apps.authentication.models import User
from decimal import Decimal

class Company(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=10, default='OI')
    logo = models.ImageField(upload_to='company_logos/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Department(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='departments')
    name = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.name} ({self.company.name})"

class Employee(models.Model):
    class StatusIndicator(models.TextChoices):
        PRESENT = 'PRESENT', 'Present (Green)'
        ON_LEAVE = 'ON_LEAVE', 'On Leave (Airplane)'
        ABSENT = 'ABSENT', 'Absent (Yellow)'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile')
    company = models.ForeignKey(Company, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    login_id = models.CharField(max_length=50, unique=True)
    
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    job_position = models.CharField(max_length=150, default='Employee')
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    location = models.CharField(max_length=150, default='Headquarters')
    date_of_joining = models.DateField()
    joining_serial = models.IntegerField(default=1)
    
    profile_picture = models.ImageField(upload_to='employee_photos/', null=True, blank=True)
    status_indicator = models.CharField(
        max_length=20,
        choices=StatusIndicator.choices,
        default=StatusIndicator.ABSENT
    )
    
    # Private Information
    date_of_birth = models.DateField(null=True, blank=True)
    residing_address = models.TextField(null=True, blank=True)
    nationality = models.CharField(max_length=100, default='Indian')
    personal_email = models.EmailField(null=True, blank=True)
    gender = models.CharField(max_length=20, default='Male')
    marital_status = models.CharField(max_length=20, default='Single')
    
    # About Me & Hobbies
    about = models.TextField(blank=True, default='Passionate professional dedicated to delivering excellence.')
    job_love_reason = models.TextField(blank=True, default='Collaborative environment and impactful, challenging work.')
    interests_hobbies = models.TextField(blank=True, default='Reading, traveling, and continuous learning.')

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.login_id})"

    @property
    def name(self):
        return f"{self.first_name} {self.last_name}"

class ResumeItem(models.Model):
    class ItemType(models.TextChoices):
        EDUCATION = 'EDUCATION', 'Education'
        EXPERIENCE = 'EXPERIENCE', 'Experience'

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='resume_items')
    title = models.CharField(max_length=255)
    organization = models.CharField(max_length=255)
    item_type = models.CharField(max_length=20, choices=ItemType.choices)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)

class Skill(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='skills')
    name = models.CharField(max_length=100)
    level = models.CharField(max_length=50, default='Intermediate')

    def __str__(self):
        return f"{self.name} ({self.level})"

class Certification(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='certifications')
    title = models.CharField(max_length=255)
    issuer = models.CharField(max_length=255)
    issue_date = models.DateField()

    def __str__(self):
        return self.title

def _to_dec(val):
    if val is None:
        return Decimal('0.00')
    if isinstance(val, Decimal):
        return val
    return Decimal(str(val))

class SalaryInfo(models.Model):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='salary_info')
    monthly_wage = models.DecimalField(max_digits=12, decimal_places=2, default=50000.00)
    working_days_per_week = models.IntegerField(default=5)
    break_time_hrs = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)
    working_schedule = models.CharField(max_length=100, default='Standard (40 hrs/week)')
    wage_type = models.CharField(max_length=50, default='Monthly')

    # Percentage definitions for components
    basic_salary_pct = models.DecimalField(max_digits=5, decimal_places=2, default=50.00)  # 50% of wage
    hra_pct = models.DecimalField(max_digits=5, decimal_places=2, default=50.00)           # 50% of Basic
    standard_allowance_pct = models.DecimalField(max_digits=5, decimal_places=2, default=16.67) # 16.67% of wage
    performance_bonus_pct = models.DecimalField(max_digits=5, decimal_places=2, default=8.33)  # 8.33% of Basic
    lta_pct = models.DecimalField(max_digits=5, decimal_places=2, default=8.33)                # 8.33% of Basic
    employee_pf_pct = models.DecimalField(max_digits=5, decimal_places=2, default=12.00)       # 12% of Basic
    employer_pf_pct = models.DecimalField(max_digits=5, decimal_places=2, default=12.00)       # 12% of Basic
    professional_tax = models.DecimalField(max_digits=8, decimal_places=2, default=200.00)

    @property
    def yearly_wage(self):
        return _to_dec(self.monthly_wage) * Decimal(12)

    @property
    def basic_salary(self):
        mw = _to_dec(self.monthly_wage)
        pct = _to_dec(self.basic_salary_pct)
        return (mw * (pct / Decimal(100))).quantize(Decimal('0.01'))

    @property
    def hra(self):
        bs = self.basic_salary
        pct = _to_dec(self.hra_pct)
        return (bs * (pct / Decimal(100))).quantize(Decimal('0.01'))

    @property
    def standard_allowance(self):
        mw = _to_dec(self.monthly_wage)
        pct = _to_dec(self.standard_allowance_pct)
        return (mw * (pct / Decimal(100))).quantize(Decimal('0.01'))

    @property
    def performance_bonus(self):
        bs = self.basic_salary
        pct = _to_dec(self.performance_bonus_pct)
        return (bs * (pct / Decimal(100))).quantize(Decimal('0.01'))

    @property
    def lta(self):
        bs = self.basic_salary
        pct = _to_dec(self.lta_pct)
        return (bs * (pct / Decimal(100))).quantize(Decimal('0.01'))

    @property
    def fixed_allowance(self):
        mw = _to_dec(self.monthly_wage)
        allocated = self.basic_salary + self.hra + self.standard_allowance + self.performance_bonus + self.lta
        rem = mw - allocated
        return rem if rem > Decimal(0) else Decimal('0.00')

    @property
    def employee_pf(self):
        bs = self.basic_salary
        pct = _to_dec(self.employee_pf_pct)
        return (bs * (pct / Decimal(100))).quantize(Decimal('0.01'))

    @property
    def employer_pf(self):
        bs = self.basic_salary
        pct = _to_dec(self.employer_pf_pct)
        return (bs * (pct / Decimal(100))).quantize(Decimal('0.01'))


class BankDetails(models.Model):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='bank_details')
    account_number = models.CharField(max_length=50)
    bank_name = models.CharField(max_length=150)
    ifsc_code = models.CharField(max_length=30)
    pan_number = models.CharField(max_length=30)
    uan_number = models.CharField(max_length=30, blank=True, null=True)
    employee_code = models.CharField(max_length=50)

    def __str__(self):
        return f"Bank Details for {self.employee.name}"
