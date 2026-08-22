from rest_framework import serializers
from apps.employees.models import (
    Company, Department, Employee, ResumeItem, Skill, 
    Certification, SalaryInfo, BankDetails
)
from apps.authentication.models import User
from datetime import datetime, date
from decimal import Decimal
from django.core.mail import send_mail
from django.conf import settings
import random
import string

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class ResumeItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeItem
        fields = '__all__'

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = '__all__'

class CertificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certification
        fields = '__all__'

class SalaryInfoSerializer(serializers.ModelSerializer):
    yearly_wage = serializers.ReadOnlyField()
    basic_salary = serializers.ReadOnlyField()
    hra = serializers.ReadOnlyField()
    standard_allowance = serializers.ReadOnlyField()
    performance_bonus = serializers.ReadOnlyField()
    lta = serializers.ReadOnlyField()
    fixed_allowance = serializers.ReadOnlyField()
    employee_pf = serializers.ReadOnlyField()
    employer_pf = serializers.ReadOnlyField()

    class Meta:
        model = SalaryInfo
        fields = '__all__'

class BankDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankDetails
        fields = '__all__'

class EmployeeSerializer(serializers.ModelSerializer):
    department_name = serializers.ReadOnlyField(source='department.name')
    company_name = serializers.ReadOnlyField(source='company.name')
    manager_name = serializers.ReadOnlyField(source='manager.name')
    resume_items = ResumeItemSerializer(many=True, read_only=True)
    skills = SkillSerializer(many=True, read_only=True)
    certifications = CertificationSerializer(many=True, read_only=True)
    salary_info = SalaryInfoSerializer(read_only=True)
    bank_details = BankDetailsSerializer(read_only=True)

    class Meta:
        model = Employee
        fields = [
            'id', 'user', 'company', 'company_name', 'department', 'department_name',
            'login_id', 'first_name', 'last_name', 'name', 'email', 'phone',
            'job_position', 'manager', 'manager_name', 'location', 'date_of_joining',
            'profile_picture', 'status_indicator', 'date_of_birth', 'residing_address',
            'nationality', 'personal_email', 'gender', 'marital_status', 'about',
            'job_love_reason', 'interests_hobbies', 'resume_items', 'skills',
            'certifications', 'salary_info', 'bank_details'
        ]

class EmployeeCreateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    department_id = serializers.IntegerField(required=False, allow_null=True)
    job_position = serializers.CharField(max_length=150, default='Software Engineer')
    manager_id = serializers.IntegerField(required=False, allow_null=True)
    location = serializers.CharField(max_length=150, default='Headquarters')
    date_of_joining = serializers.DateField(default=date.today)
    monthly_wage = serializers.DecimalField(max_digits=12, decimal_places=2, default=50000.00)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists() or Employee.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An employee/user with this email already exists.")
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        current_user = request.user if request else None

        company = None
        if current_user and hasattr(current_user, 'employee_profile') and current_user.employee_profile and current_user.employee_profile.company:
            company = current_user.employee_profile.company
        else:
            company = Company.objects.first()
            if not company:
                company = Company.objects.create(name='Odoo India', code='OI')

        first = validated_data['first_name'].strip()
        last = validated_data['last_name'].strip()
        doj = validated_data.get('date_of_joining', date.today())
        joining_year = doj.year

        # Format Login ID: OI + JODO + 2022 + 0001
        c_code = company.code.upper()
        name_code = (first[:2] + last[:2]).upper()
        
        # Calculate joining serial for that year and ensure absolute uniqueness
        same_year_count = Employee.objects.filter(
            company=company,
            date_of_joining__year=joining_year
        ).count()
        joining_serial = same_year_count + 1
        serial_str = f"{joining_serial:04d}"
        login_id = f"{c_code}{name_code}{joining_year}{serial_str}"

        while User.objects.filter(username=login_id).exists() or Employee.objects.filter(login_id=login_id).exists():
            joining_serial += 1
            serial_str = f"{joining_serial:04d}"
            login_id = f"{c_code}{name_code}{joining_year}{serial_str}"

        # Generate initial password
        initial_password = f"{first.capitalize()}@{joining_year}#" + "".join(random.choices(string.digits, k=3))

        # Create User account
        user = User.objects.create_user(
            username=login_id,
            email=validated_data['email'],
            password=initial_password,
            role=User.Role.EMPLOYEE,
            phone=validated_data.get('phone', ''),
            is_initial_password=True
        )

        department = Department.objects.filter(id=validated_data.get('department_id')).first()
        manager = Employee.objects.filter(id=validated_data.get('manager_id')).first()

        employee = Employee.objects.create(
            user=user,
            company=company,
            department=department,
            login_id=login_id,
            first_name=first,
            last_name=last,
            email=validated_data['email'],
            phone=validated_data.get('phone', ''),
            job_position=validated_data.get('job_position', 'Software Engineer'),
            manager=manager,
            location=validated_data.get('location', 'Headquarters'),
            date_of_joining=doj,
            joining_serial=joining_serial,
            status_indicator=Employee.StatusIndicator.ABSENT
        )

        # Create SalaryInfo
        SalaryInfo.objects.create(
            employee=employee,
            monthly_wage=Decimal(str(validated_data.get('monthly_wage', 50000.00)))
        )

        # Create default BankDetails
        BankDetails.objects.create(
            employee=employee,
            account_number=f"9100{random.randint(100000, 999999)}",
            bank_name="HDFC Bank",
            ifsc_code="HDFC0001234",
            pan_number=f"{first[:2].upper()}PB{random.randint(1000, 9999)}K",
            uan_number=f"1010{random.randint(10000000, 99999999)}",
            employee_code=login_id
        )

        # Create default TimeOffAllocations
        from apps.time_off.models import TimeOffAllocation, TimeOffType
        TimeOffAllocation.objects.create(employee=employee, time_off_type=TimeOffType.PAID, total_days=24)
        TimeOffAllocation.objects.create(employee=employee, time_off_type=TimeOffType.SICK, total_days=7)
        TimeOffAllocation.objects.create(employee=employee, time_off_type=TimeOffType.UNPAID, total_days=30)

        # Send credentials via Email (Plain Text + Rich HTML)
        try:
            subject = f"Welcome to {company.name} - Your Dayflow HRMS Account Credentials"
            plain_message = f"""Hello {first} {last},

Welcome to {company.name}! Your employee account has been created successfully.

--------------------------------------------------
YOUR DAYFLOW HRMS ACCOUNT CREDENTIALS:
--------------------------------------------------
Login ID:         {login_id}
Username / Email: {validated_data['email']}
Initial Password: {initial_password}
--------------------------------------------------

Please log in to your account at: http://localhost:5173/signin
After your initial login, you can change your password anytime under My Profile -> Security.

Best regards,
HR Operations Team
{company.name}
"""
            html_message = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px; background-color: #f8fafc;">
                <h2 style="color: #714B67; margin-bottom: 4px;">Welcome to {company.name}!</h2>
                <p style="color: #475569; font-size: 14px;">Your Dayflow HRMS employee account has been created successfully.</p>
                <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #cbd5e1; margin: 20px 0;">
                    <p style="margin: 4px 0; color: #1e293b; font-size: 14px;"><strong>Login ID:</strong> <span style="color: #7e22ce; font-family: monospace; font-size: 16px;">{login_id}</span></p>
                    <p style="margin: 4px 0; color: #1e293b; font-size: 14px;"><strong>Email:</strong> {validated_data['email']}</p>
                    <p style="margin: 4px 0; color: #1e293b; font-size: 14px;"><strong>Initial Password:</strong> <span style="color: #059669; font-family: monospace; font-size: 16px; font-weight: bold;">{initial_password}</span></p>
                </div>
                <p style="font-size: 13px; color: #64748b;">Log in at: <a href="http://localhost:5173/signin" style="color: #7e22ce;">http://localhost:5173/signin</a></p>
            </div>
            """
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@odoo-hrms.com')
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=from_email,
                recipient_list=[validated_data['email']],
                html_message=html_message,
                fail_silently=True
            )
        except Exception as e:
            print(f"Error dispatching email: {e}")

        # Save initial password metadata to return in API for UI display
        employee.initial_generated_password = initial_password
        return employee

