import os
import django
import random
from datetime import date, timedelta
from decimal import Decimal
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.authentication.models import User
from apps.employees.models import (
    Company, Department, Employee, ResumeItem, Skill, 
    Certification, SalaryInfo, BankDetails
)
from apps.attendance.models import AttendanceRecord
from apps.time_off.models import TimeOffAllocation, TimeOffRequest, PublicHoliday, TimeOffType

def seed():
    print("Seeding database...")
    
    # 1. Company
    company, _ = Company.objects.get_or_create(
        name='Odoo India',
        defaults={'code': 'OI'}
    )

    # 2. Departments
    dept_eng, _ = Department.objects.get_or_create(company=company, name='Engineering')
    dept_hr, _ = Department.objects.get_or_create(company=company, name='Human Resources')
    dept_design, _ = Department.objects.get_or_create(company=company, name='Product Design')
    dept_qa, _ = Department.objects.get_or_create(company=company, name='Quality Assurance')

    # 3. Admin Account
    admin_user, created = User.objects.get_or_create(
        username='admin@odoo.com',
        defaults={
            'email': 'admin@odoo.com',
            'role': User.Role.ADMIN,
            'is_initial_password': False
        }
    )
    if created:
        admin_user.set_password('AdminPassword123')
        admin_user.save()

    admin_emp, _ = Employee.objects.get_or_create(
        user=admin_user,
        defaults={
            'company': company,
            'department': dept_hr,
            'login_id': 'admin@odoo.com',
            'first_name': 'Mitchell',
            'last_name': 'Admin',
            'email': 'admin@odoo.com',
            'phone': '+91 98765 43210',
            'job_position': 'HR Manager & System Admin',
            'location': 'Mumbai Office',
            'date_of_joining': date(2020, 1, 15),
            'status_indicator': Employee.StatusIndicator.PRESENT,
            'about': 'Head of HR operations and system strategy at Odoo India.',
            'job_love_reason': 'Building great work culture and empowering team growth.',
            'interests_hobbies': 'Leadership coaching, chess, and marathon running.'
        }
    )

    SalaryInfo.objects.get_or_create(
        employee=admin_emp,
        defaults={'monthly_wage': Decimal('120000.00')}
    )
    BankDetails.objects.get_or_create(
        employee=admin_emp,
        defaults={
            'account_number': '50100234567891',
            'bank_name': 'HDFC Bank',
            'ifsc_code': 'HDFC0001234',
            'pan_number': 'ABCDE1234F',
            'uan_number': '100987654321',
            'employee_code': 'OI-ADM-001'
        }
    )

    # 4. HR Officer Account
    hr_user, created = User.objects.get_or_create(
        username='OIHR20220001',
        defaults={
            'email': 'hr@odoo.com',
            'role': User.Role.HR_OFFICER,
            'is_initial_password': False
        }
    )
    if created:
        hr_user.set_password('HrPassword123')
        hr_user.save()

    hr_emp, _ = Employee.objects.get_or_create(
        user=hr_user,
        defaults={
            'company': company,
            'department': dept_hr,
            'login_id': 'OIHR20220001',
            'first_name': 'Sarah',
            'last_name': 'Jenkins',
            'email': 'hr@odoo.com',
            'phone': '+91 98765 11223',
            'job_position': 'Senior HR Officer',
            'manager': admin_emp,
            'location': 'Mumbai Office',
            'date_of_joining': date(2022, 3, 10),
            'status_indicator': Employee.StatusIndicator.PRESENT,
            'about': 'Managing employee onboarding, leave allocations, and payroll operations.',
            'job_love_reason': 'Helping employees feel supported every single day.',
            'interests_hobbies': 'Yoga, interior design, and reading fiction.'
        }
    )

    SalaryInfo.objects.get_or_create(employee=hr_emp, defaults={'monthly_wage': Decimal('75000.00')})
    BankDetails.objects.get_or_create(
        employee=hr_emp,
        defaults={
            'account_number': '50100887766554',
            'bank_name': 'ICICI Bank',
            'ifsc_code': 'ICIC0000999',
            'pan_number': 'SAJEN9876K',
            'uan_number': '100888999000',
            'employee_code': 'OIHR20220001'
        }
    )

    # 5. Employees list
    sample_employees = [
        {
            'first': 'John', 'last': 'Doe', 'login': 'OIJODO20220001', 'email': 'john.doe@odoo.com',
            'dept': dept_eng, 'job': 'Senior Software Engineer', 'wage': Decimal('85000.00'),
            'status': Employee.StatusIndicator.PRESENT, 'doj': date(2022, 1, 10),
            'about': 'Full-stack software architect specializing in Python and React apps.',
            'hobbies': 'Open source contribution, gaming, and acoustic guitar.'
        },
        {
            'first': 'Jane', 'last': 'Smith', 'login': 'OIJASM20220002', 'email': 'jane.smith@odoo.com',
            'dept': dept_design, 'job': 'Lead Product Designer', 'wage': Decimal('90000.00'),
            'status': Employee.StatusIndicator.ON_LEAVE, 'doj': date(2022, 2, 15),
            'about': 'Crafting clean, accessible, and user-friendly digital experiences.',
            'hobbies': 'Digital painting, photography, and hiking.'
        },
        {
            'first': 'Mark', 'last': 'Wilson', 'login': 'OIMAWI20220003', 'email': 'mark.wilson@odoo.com',
            'dept': dept_eng, 'job': 'Frontend Specialist', 'wage': Decimal('70000.00'),
            'status': Employee.StatusIndicator.PRESENT, 'doj': date(2022, 5, 20),
            'about': 'Passionate React developer building responsive web applications.',
            'hobbies': 'Cycling, tech blogs, and coffee roasting.'
        },
        {
            'first': 'Priya', 'last': 'Sharma', 'login': 'OIPRSH20220004', 'email': 'priya.sharma@odoo.com',
            'dept': dept_qa, 'job': 'QA Automation Lead', 'wage': Decimal('65000.00'),
            'status': Employee.StatusIndicator.ABSENT, 'doj': date(2022, 8, 1),
            'about': 'Ensuring top-notch product quality through automated test frameworks.',
            'hobbies': 'Baking, badminton, and podcasting.'
        }
    ]

    for item in sample_employees:
        usr, u_created = User.objects.get_or_create(
            username=item['login'],
            defaults={
                'email': item['email'],
                'role': User.Role.EMPLOYEE,
                'is_initial_password': False
            }
        )
        if u_created:
            usr.set_password('EmpPassword123')
            usr.save()

        emp, _ = Employee.objects.get_or_create(
            user=usr,
            defaults={
                'company': company,
                'department': item['dept'],
                'login_id': item['login'],
                'first_name': item['first'],
                'last_name': item['last'],
                'email': item['email'],
                'phone': f"+91 98765 {random.randint(10000, 99999)}",
                'job_position': item['job'],
                'manager': hr_emp,
                'location': 'Mumbai Office',
                'date_of_joining': item['doj'],
                'status_indicator': item['status'],
                'about': item['about'],
                'interests_hobbies': item['hobbies']
            }
        )

        SalaryInfo.objects.get_or_create(employee=emp, defaults={'monthly_wage': item['wage']})
        BankDetails.objects.get_or_create(
            employee=emp,
            defaults={
                'account_number': f"9100{random.randint(100000, 999999)}",
                'bank_name': 'HDFC Bank',
                'ifsc_code': 'HDFC0004321',
                'pan_number': f"{item['first'][:2].upper()}PS{random.randint(1000, 9999)}P",
                'uan_number': f"1010{random.randint(10000000, 99999999)}",
                'employee_code': item['login']
            }
        )

        # Allocations
        TimeOffAllocation.objects.get_or_create(employee=emp, time_off_type=TimeOffType.PAID, defaults={'total_days': 24, 'used_days': 2})
        TimeOffAllocation.objects.get_or_create(employee=emp, time_off_type=TimeOffType.SICK, defaults={'total_days': 7, 'used_days': 1})
        TimeOffAllocation.objects.get_or_create(employee=emp, time_off_type=TimeOffType.UNPAID, defaults={'total_days': 30, 'used_days': 0})

        # Resume & Skills
        Skill.objects.get_or_create(employee=emp, name='React.js', defaults={'level': 'Expert'})
        Skill.objects.get_or_create(employee=emp, name='Django', defaults={'level': 'Advanced'})
        Skill.objects.get_or_create(employee=emp, name='PostgreSQL', defaults={'level': 'Advanced'})

        Certification.objects.get_or_create(
            employee=emp, title='AWS Certified Cloud Practitioner',
            defaults={'issuer': 'Amazon Web Services', 'issue_date': date(2023, 4, 15)}
        )

        ResumeItem.objects.get_or_create(
            employee=emp, title='B.Tech in Computer Science',
            defaults={
                'organization': 'IIT Bombay',
                'item_type': ResumeItem.ItemType.EDUCATION,
                'start_date': date(2017, 8, 1),
                'end_date': date(2021, 5, 30),
                'description': 'Graduated with Distinction in Software Architecture and Database Systems.'
            }
        )

    # 6. Public Holidays
    holidays = [
        {'name': 'Republic Day', 'date': date(2026, 1, 26)},
        {'name': 'Independence Day', 'date': date(2026, 8, 15)},
        {'name': 'Gandhi Jayanti', 'date': date(2026, 10, 2)},
        {'name': 'Diwali', 'date': date(2026, 11, 8)},
        {'name': 'Christmas', 'date': date(2026, 12, 25)},
    ]
    for h in holidays:
        PublicHoliday.objects.get_or_create(name=h['name'], date=h['date'])

    # 7. Sample Attendance records for today & recent days
    today = date.today()
    for emp in Employee.objects.all():
        AttendanceRecord.objects.get_or_create(
            employee=emp, date=today,
            defaults={
                'check_in': timezone.now() - timedelta(hours=4),
                'check_out': None if emp.status_indicator == Employee.StatusIndicator.PRESENT else timezone.now(),
                'work_hours': Decimal('4.00') if emp.status_indicator == Employee.StatusIndicator.PRESENT else Decimal('8.00'),
                'extra_hours': Decimal('0.00'),
                'break_hours': Decimal('1.00'),
                'status': AttendanceRecord.AttendanceStatus.PRESENT if emp.status_indicator == Employee.StatusIndicator.PRESENT else AttendanceRecord.AttendanceStatus.ABSENT
            }
        )

    # 8. Sample Time Off Requests
    jane_emp = Employee.objects.filter(login_id='OIJASM20220002').first()
    if jane_emp:
        TimeOffRequest.objects.get_or_create(
            employee=jane_emp,
            start_date=today,
            end_date=today + timedelta(days=2),
            defaults={
                'time_off_type': TimeOffType.PAID,
                'days_count': 3,
                'reason': 'Family function and personal travel.',
                'status': TimeOffRequest.RequestStatus.APPROVED,
                'approved_by': admin_user
            }
        )

    john_emp = Employee.objects.filter(login_id='OIJODO20220001').first()
    if john_emp:
        TimeOffRequest.objects.get_or_create(
            employee=john_emp,
            start_date=today + timedelta(days=5),
            end_date=today + timedelta(days=6),
            defaults={
                'time_off_type': TimeOffType.SICK,
                'days_count': 2,
                'reason': 'Dental surgery recovery.',
                'status': TimeOffRequest.RequestStatus.PENDING
            }
        )

    print("Database seeding completed successfully!")

if __name__ == '__main__':
    seed()
