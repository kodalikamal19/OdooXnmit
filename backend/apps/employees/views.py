from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q
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
        if request.user.role not in [User.Role.ADMIN, User.Role.HR_OFFICER]:
            return Response({'error': 'Only Admin or HR Officers can create new employees.'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = EmployeeCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            employee = serializer.save()
            full_data = EmployeeSerializer(employee, context={'request': request}).data
            full_data['generated_login_id'] = employee.login_id
            full_data['generated_password'] = getattr(employee, 'initial_generated_password', '')
            return Response(full_data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['put', 'patch'], permission_classes=[permissions.IsAuthenticated])
    def update_private_info(self, request, pk=None):
        employee = self.get_object()
        user = request.user
        
        # Regular employee can only update their own private info
        if user.role == User.Role.EMPLOYEE and employee.user != user:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        allowed_fields = [
            'date_of_birth', 'residing_address', 'nationality', 'personal_email',
            'gender', 'marital_status', 'about', 'job_love_reason', 'interests_hobbies', 'phone'
        ]
        
        # If Admin or HR, allow updating core info too
        if user.role in [User.Role.ADMIN, User.Role.HR_OFFICER]:
            allowed_fields.extend(['first_name', 'last_name', 'email', 'job_position', 'location', 'department_id', 'manager_id'])

        for field in allowed_fields:
            if field in request.data:
                setattr(employee, field, request.data[field])

        employee.save()
        return Response(EmployeeSerializer(employee, context={'request': request}).data)

    @action(detail=True, methods=['put', 'patch'], permission_classes=[IsAdminOrHR])
    def update_salary_info(self, request, pk=None):
        employee = self.get_object()
        salary_info, _ = SalaryInfo.objects.get_or_create(employee=employee)
        serializer = SalaryInfoSerializer(salary_info, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(EmployeeSerializer(employee, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
