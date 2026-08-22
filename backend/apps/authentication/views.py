from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from apps.authentication.models import User
from apps.authentication.serializers import SignUpCompanySerializer, UserSerializer, ChangePasswordSerializer
from apps.employees.models import Employee
from apps.employees.serializers import EmployeeSerializer
import logging

logger = logging.getLogger(__name__)


def build_auth_response(user, request):
    """
    Helper function to build a consistent authentication response.
    """
    try:
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

        refresh = RefreshToken.for_user(user)
        
        return {
            'success': True,
            'token': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
            'employee': emp_data,
            'company': company_data
        }
    except Exception as e:
        logger.error(f"Error building auth response for user {user.id}: {str(e)}", exc_info=True)
        raise


class SignUpView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            serializer = SignUpCompanySerializer(data=request.data)
            if serializer.is_valid():
                user, company = serializer.save()
                response_data = build_auth_response(user, request)
                logger.info(f"New company signup: {company.name} with user {user.email}")
                return Response(response_data, status=status.HTTP_201_CREATED)
            
            logger.warning(f"Signup validation failed: {serializer.errors}")
            return Response({
                'success': False,
                'error': 'Signup validation failed',
                'code': 'VALIDATION_ERROR',
                'details': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Signup error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'An error occurred during signup. Please try again.',
                'code': 'SIGNUP_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SignInView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            login_id_or_email = request.data.get('login_id') or request.data.get('email')
            password = request.data.get('password')

            # Validate input
            if not login_id_or_email or not password:
                return Response({
                    'success': False,
                    'error': 'Please provide Login ID/Email and Password.',
                    'code': 'MISSING_CREDENTIALS'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Allow user to log in via username (Login ID) or Email
            user = User.objects.filter(username__iexact=login_id_or_email).first()
            if not user:
                user = User.objects.filter(email__iexact=login_id_or_email).first()

            if user and user.check_password(password):
                if not user.is_active:
                    logger.warning(f"Inactive user login attempt: {login_id_or_email}")
                    return Response({
                        'success': False,
                        'error': 'User account is inactive.',
                        'code': 'INACTIVE_USER'
                    }, status=status.HTTP_401_UNAUTHORIZED)
                
                response_data = build_auth_response(user, request)
                logger.info(f"User login successful: {user.email}")
                return Response(response_data, status=status.HTTP_200_OK)

            logger.warning(f"Failed login attempt for: {login_id_or_email}")
            return Response({
                'success': False,
                'error': 'Invalid Login ID/Email or Password.',
                'code': 'INVALID_CREDENTIALS'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
        except Exception as e:
            logger.error(f"Sign in error: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'An error occurred during login. Please try again.',
                'code': 'SIGNIN_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            response_data = build_auth_response(request.user, request)
            return Response(response_data)
        except Exception as e:
            logger.error(f"Error fetching user profile for {request.user.id}: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'An error occurred fetching your profile.',
                'code': 'PROFILE_FETCH_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            user = request.user
            serializer = ChangePasswordSerializer(data=request.data)
            
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'error': 'Validation failed',
                    'code': 'VALIDATION_ERROR',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

            if not user.check_password(serializer.validated_data['old_password']):
                logger.warning(f"Failed password change attempt for user {user.id} - incorrect old password")
                return Response({
                    'success': False,
                    'error': 'Incorrect current password.',
                    'code': 'INCORRECT_PASSWORD'
                }, status=status.HTTP_400_BAD_REQUEST)

            user.set_password(serializer.validated_data['new_password'])
            user.is_initial_password = False
            user.save()
            
            logger.info(f"Password changed for user {user.id}")
            return Response({
                'success': True,
                'message': 'Password changed successfully.'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error changing password for user {request.user.id}: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': 'An error occurred while changing password.',
                'code': 'PASSWORD_CHANGE_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

