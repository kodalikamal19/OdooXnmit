from rest_framework import serializers
from apps.authentication.models import User
from apps.employees.models import Company, Employee
import re
import logging

logger = logging.getLogger(__name__)


def validate_password_strength(password):
    """
    Validate password strength with specific requirements.
    """
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
    
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter (A-Z).")
    
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter (a-z).")
    
    if not re.search(r"[0-9]", password):
        errors.append("Password must contain at least one number (0-9).")
    
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        errors.append("Password must contain at least one special character (!@#$%^&*...).")
    
    # Check for common weak passwords
    common_passwords = ['password', 'admin123', '12345678', 'qwerty', 'letmein']
    if password.lower() in common_passwords:
        errors.append("This password is too common. Please choose a stronger password.")
    
    return errors


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
    company_name = serializers.CharField(max_length=255, required=True)
    company_logo = serializers.ImageField(required=False, allow_null=True)
    name = serializers.CharField(max_length=255, required=True)
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8, required=True)
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate_company_name(self, value):
        """Validate company name."""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Company name cannot be empty.")
        if len(value) > 255:
            raise serializers.ValidationError("Company name is too long (max 255 characters).")
        return value

    def validate_email(self, value):
        """Check if email already exists."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_name(self, value):
        """Validate full name."""
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Name cannot be empty.")
        if len(value) > 255:
            raise serializers.ValidationError("Name is too long (max 255 characters).")
        return value

    def validate_phone(self, value):
        """Validate phone number format."""
        if value and not re.match(r'^[\d\s\-\+\(\)]+$', value):
            raise serializers.ValidationError("Invalid phone number format.")
        return value

    def validate(self, data):
        """Validate password matching and strength."""
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        
        # Check password match
        if password != confirm_password:
            raise serializers.ValidationError({
                "confirm_password": "Passwords do not match."
            })
        
        # Check password strength
        password_errors = validate_password_strength(password)
        if password_errors:
            raise serializers.ValidationError({
                "password": password_errors
            })
        
        return data

    def create(self, validated_data):
        """Create company and admin user."""
        try:
            company_name = validated_data['company_name'].strip()
            company_logo = validated_data.get('company_logo')
            
            # Derive company prefix code e.g. "Odoo India" -> "OI"
            words = company_name.split()
            if len(words) >= 2:
                code = (words[0][0] + words[1][0]).upper()
            else:
                code = company_name[:2].upper()

            company = Company.objects.create(name=company_name, code=code, logo=company_logo)

            full_name = validated_data['name'].strip().split(' ', 1)
            first_name = full_name[0]
            last_name = full_name[1] if len(full_name) > 1 else ''

            # Admin username is set to email
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

            logger.info(f"New company created: {company_name} with admin user {admin_username}")
            return user, company
        except Exception as e:
            logger.error(f"Error creating company and user: {str(e)}", exc_info=True)
            raise serializers.ValidationError("An error occurred during signup. Please try again.")


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, min_length=8, write_only=True)
    confirm_new_password = serializers.CharField(required=True, write_only=True)

    def validate_new_password(self, value):
        """Validate new password strength."""
        password_errors = validate_password_strength(value)
        if password_errors:
            raise serializers.ValidationError(password_errors)
        return value

    def validate(self, data):
        """Validate that new passwords match."""
        new_password = data.get('new_password')
        confirm_new_password = data.get('confirm_new_password')
        
        if new_password != confirm_new_password:
            raise serializers.ValidationError({
                "confirm_new_password": "New passwords do not match."
            })
        
        old_password = data.get('old_password')
        if old_password == new_password:
            raise serializers.ValidationError({
                "new_password": "New password must be different from the current password."
            })
        
        return data
