"""
Custom exception handlers for consistent error responses across the API.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler to format all API errors consistently.
    Logs errors for debugging and returns standardized response.
    """
    response = exception_handler(exc, context)

    if response is None:
        # Handle unexpected exceptions
        logger.error(
            f"Unhandled exception: {exc}",
            exc_info=True,
            extra={'context': context}
        )
        return Response(
            {
                'success': False,
                'error': 'An unexpected error occurred. Please try again later.',
                'code': 'INTERNAL_SERVER_ERROR'
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Log the error
    logger.warning(
        f"API Error: {response.status_code} - {str(exc)}",
        extra={'context': context}
    )

    # Format the error response consistently
    error_detail = response.data

    # Handle different types of error responses
    if isinstance(error_detail, dict):
        # For field-level errors from serializers
        if 'detail' in error_detail:
            formatted_response = {
                'success': False,
                'error': str(error_detail['detail']),
                'code': get_error_code(response.status_code)
            }
        else:
            # Multiple field errors
            formatted_response = {
                'success': False,
                'error': 'Validation failed',
                'code': 'VALIDATION_ERROR',
                'details': error_detail
            }
    else:
        # String error messages
        formatted_response = {
            'success': False,
            'error': str(error_detail),
            'code': get_error_code(response.status_code)
        }

    response.data = formatted_response
    return response


def get_error_code(status_code):
    """Map HTTP status codes to error codes."""
    error_codes = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        405: 'METHOD_NOT_ALLOWED',
        409: 'CONFLICT',
        422: 'UNPROCESSABLE_ENTITY',
        429: 'TOO_MANY_REQUESTS',
        500: 'INTERNAL_SERVER_ERROR',
        502: 'BAD_GATEWAY',
        503: 'SERVICE_UNAVAILABLE',
    }
    return error_codes.get(status_code, 'API_ERROR')
