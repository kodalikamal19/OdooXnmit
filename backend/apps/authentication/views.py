from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from apps.authentication.models import User
from apps.authentication.serializers import SignUpCompanySerializer, UserSerializer, ChangePasswordSerializer
from apps.employees.models import Employee
from apps.employees.serializers import EmployeeSerializer

class SignUpView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SignUpCompanySerializer(data=request.data)
        if serializer.is_valid():
            user, company = serializer.save()
            refresh = RefreshToken.for_user(user)
            employee = getattr(user, 'employee_profile', None)
            emp_data = EmployeeSerializer(employee, context={'request': request}).data if employee else None
            
            return Response({
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
                'employee': emp_data,
                'company': {
                    'id': company.id,
                    'name': company.name,
                    'code': company.code,
                    'logo': request.build_absolute_uri(company.logo.url) if company.logo else None
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SignInView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        login_id_or_email = request.data.get('login_id') or request.data.get('email')
        password = request.data.get('password')

        if not login_id_or_email or not password:
            return Response({'error': 'Please provide Login ID/Email and Password.'}, status=status.HTTP_400_BAD_REQUEST)

        # Allow user to log in via username (Login ID) or Email
        user = User.objects.filter(username__iexact=login_id_or_email).first()
        if not user:
            user = User.objects.filter(email__iexact=login_id_or_email).first()

        if user and user.check_password(password):
            if not user.is_active:
                return Response({'error': 'User account is inactive.'}, status=status.HTTP_401_UNAUTHORIZED)
            
            refresh = RefreshToken.for_user(user)
            employee = getattr(user, 'employee_profile', None)
            emp_data = EmployeeSerializer(employee, context={'request': request}).data if employee else None

            company_data = None
            if employee and employee.company:
                company = employee.company
                company_data = {
                    'id': company.id,
                    'name': company.name,
                    'code': company.code,
                    'logo': request.build_absolute_uri(company.logo.url) if company.logo else None
                }

            return Response({
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
                'employee': emp_data,
                'company': company_data
            }, status=status.HTTP_200_OK)

        return Response({'error': 'Invalid Login ID/Email or Password.'}, status=status.HTTP_401_UNAUTHORIZED)

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        employee = getattr(user, 'employee_profile', None)
        emp_data = EmployeeSerializer(employee, context={'request': request}).data if employee else None
        
        company_data = None
        if employee and employee.company:
            company = employee.company
            company_data = {
                'id': company.id,
                'name': company.name,
                'code': company.code,
                'logo': request.build_absolute_uri(company.logo.url) if company.logo else None
            }

        return Response({
            'user': UserSerializer(user).data,
            'employee': emp_data,
            'company': company_data
        })

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({'old_password': 'Incorrect current password.'}, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(serializer.validated_data['new_password'])
            user.is_initial_password = False
            user.save()
            return Response({'message': 'Password changed successfully.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
