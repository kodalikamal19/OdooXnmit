"""
Middleware for error handling, logging, and request/response tracking.
"""
import logging
import json
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(MiddlewareMixin):
    """
    Middleware to catch unhandled exceptions and return consistent error responses.
    """

    def process_exception(self, request, exception):
        """Handle any exceptions that weren't caught by views."""
        logger.error(
            f"Unhandled exception in {request.method} {request.path}",
            exc_info=True,
            extra={
                'request_path': request.path,
                'request_method': request.method,
                'request_user': str(request.user) if request.user.is_authenticated else 'Anonymous'
            }
        )

        return JsonResponse(
            {
                'success': False,
                'error': 'An unexpected error occurred. Our team has been notified.',
                'code': 'INTERNAL_SERVER_ERROR'
            },
            status=500
        )


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log all API requests for debugging and monitoring.
    """

    EXCLUDED_PATHS = ['/health/', '/ping/', '/static/', '/media/']

    def should_log(self, path):
        """Check if path should be logged."""
        return not any(path.startswith(excluded) for excluded in self.EXCLUDED_PATHS)

    def process_request(self, request):
        """Log incoming requests."""
        if self.should_log(request.path):
            logger.debug(
                f"API Request: {request.method} {request.path}",
                extra={
                    'method': request.method,
                    'path': request.path,
                    'remote_addr': self.get_client_ip(request),
                    'user': str(request.user) if request.user.is_authenticated else 'Anonymous'
                }
            )
        request._start_time = __import__('time').time()

    def process_response(self, request, response):
        """Log response times and status codes."""
        if self.should_log(request.path) and hasattr(request, '_start_time'):
            duration = __import__('time').time() - request._start_time
            logger.debug(
                f"API Response: {request.method} {request.path} - {response.status_code}",
                extra={
                    'method': request.method,
                    'path': request.path,
                    'status_code': response.status_code,
                    'duration_ms': round(duration * 1000, 2),
                }
            )
        return response

    @staticmethod
    def get_client_ip(request):
        """Get client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ValidationErrorMiddleware(MiddlewareMixin):
    """
    Middleware to catch and format validation errors.
    """

    def process_exception(self, request, exception):
        """Handle validation errors from serializers."""
        from django.core.exceptions import ValidationError
        from rest_framework.exceptions import ValidationError as DRFValidationError

        if isinstance(exception, (ValidationError, DRFValidationError)):
            logger.warning(
                f"Validation error in {request.method} {request.path}",
                extra={
                    'path': request.path,
                    'error': str(exception)
                }
            )
            return JsonResponse(
                {
                    'success': False,
                    'error': 'Invalid input provided',
                    'code': 'VALIDATION_ERROR',
                    'details': str(exception)
                },
                status=400
            )

        return None
