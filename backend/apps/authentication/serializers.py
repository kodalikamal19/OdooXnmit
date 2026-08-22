from rest_framework import serializers
from apps.authentication.models import User
from apps.employees.models import Company, Employee
import re

class UserSerializer(serializers.ModelSerializer):
    employee_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'is_initial_password', 'phone', 'employee_id']

    def get_employee_id(self, obj):
        if hasattr(obj, 'employee_profile'):
            return obj.employee_profile.id
        return None

class SignUpCompanySerializer(serializers.Serializer):
    company_name = serializers.CharField(max_length=255)
    company_logo = serializers.ImageField(required=False, allow_null=True)
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        
        # Password complexity validation
        pwd = data['password']
        if not re.search(r"[A-Z]", pwd):
            raise serializers.ValidationError({"password": "Password must contain at least one uppercase letter."})
        if not re.search(r"[a-z]", pwd):
            raise serializers.ValidationError({"password": "Password must contain at least one lowercase letter."})
        if not re.search(r"[0-9]", pwd):
            raise serializers.ValidationError({"password": "Password must contain at least one number."})

        return data

    def create(self, validated_data):
        company_name = validated_data['company_name']
        company_logo = validated_data.get('company_logo')
        
        # Derive company prefix code e.g. "Odoo India" -> "OI"
        words = company_name.strip().split()
        if len(words) >= 2:
            code = (words[0][0] + words[1][0]).upper()
        else:
            code = company_name[:2].upper()

        company = Company.objects.create(name=company_name, code=code, logo=company_logo)

        full_name = validated_data['name'].strip().split(' ', 1)
        first_name = full_name[0]
        last_name = full_name[1] if len(full_name) > 1 else ''

        # Admin username is set to email or generated admin code
        admin_username = validated_data['email']
        
        user = User.objects.create_user(
            username=admin_username,
            email=validated_data['email'],
            password=validated_data['password'],
            role=User.Role.ADMIN,
            phone=validated_data.get('phone', ''),
            is_initial_password=False
        )

        from datetime import date
        # Create Employee profile for Admin
        Employee.objects.create(
            user=user,
            company=company,
            login_id=admin_username,
            first_name=first_name,
            last_name=last_name or 'Admin',
            email=validated_data['email'],
            phone=validated_data.get('phone', ''),
            job_position='System Administrator / HR Head',
            date_of_joining=date.today(),
            status_indicator=Employee.StatusIndicator.PRESENT
        )

        return user, company

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_new_password = serializers.CharField(required=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_new_password']:
            raise serializers.ValidationError({"confirm_new_password": "New passwords do not match."})
        pwd = data['new_password']
        if not re.search(r"[A-Z]", pwd):
            raise serializers.ValidationError({"new_password": "Password must contain at least one uppercase letter."})
        if not re.search(r"[0-9]", pwd):
            raise serializers.ValidationError({"new_password": "Password must contain at least one number."})
        return data
