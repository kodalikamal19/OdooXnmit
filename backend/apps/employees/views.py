from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
from django.core.exceptions import ValidationError
from apps.employees.models import (
    Company, Department, Employee, ResumeItem, Skill, 
    Certification, SalaryInfo, BankDetails
)
from apps.employees.serializers import (
    CompanySerializer, DepartmentSerializer, EmployeeSerializer,
    EmployeeCreateSerializer, ResumeItemSerializer, SkillSerializer,
    CertificationSerializer, SalaryInfoSerializer, BankDetailsSerializer
)
from apps.authentication.models import User
import logging

logger = logging.getLogger(__name__)

class IsAdminOrHR(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in [User.Role.ADMIN, User.Role.HR_OFFICER]

class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Employee.objects.all().select_related(
            'user', 'company', 'department', 'manager', 'salary_info', 'bank_details'
        ).prefetch_related('resume_items', 'skills', 'certifications')
        
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(login_id__icontains=search) |
                Q(email__icontains=search) |
                Q(job_position__icontains=search) |
                Q(department__name__icontains=search)
            )
        return queryset

    def create(self, request, *args, **kwargs):
        try:
            if request.user.role not in [User.Role.ADMIN, User.Role.HR_OFFICER]:
                logger.warning(f"Unauthorized employee creation attempt by {request.user.id}")
                return Response({
                    'success': False,
                    'error': 'Only Admin or HR Officers can create new employees.',
                    'code': 'PERMISSION_DENIED'
                }, status=status.HTTP_403_FORBIDDEN)
            
            serializer = EmployeeCreateSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                employee = serializer.save()
                full_data = EmployeeSerializer(employee, context={'request': request}).data
                full_data['generated_login_id'] = employee.login_id
                full_data['generated_password'] = getattr(employee, 'initial_generated_password', '')
                logger.info(f"New employee created: {employee.login_id} by {request.user.id}")
                return Response({
                    'success': True,
                    'data': full_data
                }, status=status.HTTP_201_CREATED)
            
            logger.warning(f"Employee creation validation failed: {serializer.errors}")
            return Response({
                'success': False,
                'error': 'Validation failed',
                'code': 'VALIDATION_ERROR',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating employee: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'An error occurred while creating employee.',
                'code': 'CREATION_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['put', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def update_private_info(self, request, pk=None):
        try:
            employee = self.get_object()
            user = request.user
            
            # Regular employee can only update their own private info
            if user.role == User.Role.EMPLOYEE and employee.user != user:
                logger.warning(f"Unauthorized private info update attempt by {user.id} for employee {employee.id}")
                return Response({
                    'success': False,
                    'error': 'Permission denied.',
                    'code': 'PERMISSION_DENIED'
                }, status=status.HTTP_403_FORBIDDEN)

            allowed_fields = [
                'date_of_birth', 'residing_address', 'nationality', 'personal_email',
                'gender', 'marital_status', 'about', 'job_love_reason', 'interests_hobbies', 'phone'
            ]
            
            # If Admin or HR, allow updating core info too
            if user.role in [User.Role.ADMIN, User.Role.HR_OFFICER]:
                allowed_fields.extend(['first_name', 'last_name', 'email', 'job_position', 'location', 'department_id', 'manager_id'])

            # Validate that only allowed fields are being updated
            invalid_fields = set(request.data.keys()) - set(allowed_fields)
            if invalid_fields:
                logger.warning(f"Attempt to update invalid fields by {user.id}: {invalid_fields}")
                return Response({
                    'success': False,
                    'error': f'Invalid fields: {", ".join(invalid_fields)}',
                    'code': 'INVALID_FIELDS'
                }, status=status.HTTP_400_BAD_REQUEST)

            for field in allowed_fields:
                if field in request.data:
                    try:
                        setattr(employee, field, request.data[field])
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Invalid value for field {field}: {str(e)}")
                        return Response({
                            'success': False,
                            'error': f'Invalid value for {field}',
                            'code': 'INVALID_VALUE'
                        }, status=status.HTTP_400_BAD_REQUEST)

            employee.full_clean()  # Validate model constraints
            employee.save()
            logger.info(f"Private info updated for employee {employee.id} by {user.id}")
            
            return Response({
                'success': True,
                'data': EmployeeSerializer(employee, context={'request': request}).data
            })
        except ValidationError as e:
            logger.warning(f"Validation error updating private info: {str(e)}")
            return Response({
                'success': False,
                'error': 'Validation failed',
                'code': 'VALIDATION_ERROR',
                'details': dict(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error updating private info: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'An error occurred while updating private info.',
                'code': 'UPDATE_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['put', 'patch'], permission_classes=[IsAdminOrHR])
    def update_salary_info(self, request, pk=None):
        try:
            employee = self.get_object()
            salary_info, _ = SalaryInfo.objects.get_or_create(employee=employee)
            serializer = SalaryInfoSerializer(salary_info, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                logger.info(f"Salary info updated for employee {employee.id} by {request.user.id}")
                return Response({
                    'success': True,
                    'data': EmployeeSerializer(employee, context={'request': request}).data
                })
            
            logger.warning(f"Salary info validation failed: {serializer.errors}")
            return Response({
                'success': False,
                'error': 'Validation failed',
                'code': 'VALIDATION_ERROR',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error updating salary info: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'An error occurred while updating salary info.',
                'code': 'UPDATE_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SkillViewSet(viewsets.ModelViewSet):
    serializer_class = SkillSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Skill.objects.all()

class CertificationViewSet(viewsets.ModelViewSet):
    serializer_class = CertificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Certification.objects.all()

class ResumeItemViewSet(viewsets.ModelViewSet):
    serializer_class = ResumeItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = ResumeItem.objects.all()

class DepartmentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Department.objects.all()
