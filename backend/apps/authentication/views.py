"""Authentication views: login, token refresh, logout, change password, company signup."""
import os
from datetime import datetime, timezone
from bson import ObjectId
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.db import col
from apps.authentication.utils import (
    hash_password, check_password, validate_password_strength,
    generate_secure_password, generate_login_id,
)
from apps.authentication.backends import (
    MongoJWTAuthentication, create_tokens, decode_token, MongoUser,
)


def _serialize_user(doc: dict, include_employee: bool = True) -> dict:
    data = {
        "id": str(doc["_id"]),
        "email": doc.get("email", ""),
        "login_id": doc.get("login_id", ""),
        "role": doc.get("role", "employee"),
        "company_id": str(doc.get("company_id", "")) if doc.get("company_id") else None,
        "employee_id": str(doc.get("employee_id", "")) if doc.get("employee_id") else None,
        "is_first_login": doc.get("is_first_login", False),
    }
    if include_employee and doc.get("employee_id"):
        emp = col("employees").find_one({"_id": doc["employee_id"]})
        if emp:
            data["employee"] = {
                "id": str(emp["_id"]),
                "full_name": emp.get("full_name", ""),
                "profile_image": emp.get("profile_image", ""),
                "department": emp.get("department", ""),
                "job_position": emp.get("job_position", ""),
            }
    return data


class CompanySignUpView(APIView):
    """Create the first company + admin account. Only used during initial setup."""
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        name = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        phone = data.get("phone", "").strip()
        password = data.get("password", "")
        confirm = data.get("confirm_password", "")
        company_name = data.get("company_name", "").strip()

        # Validate
        errors = {}
        if not name:
            errors["name"] = "Name is required."
        if not email or "@" not in email:
            errors["email"] = "Valid email is required."
        if not phone:
            errors["phone"] = "Phone number is required."
        if not company_name:
            errors["company_name"] = "Company name is required."
        pw_errors = validate_password_strength(password)
        if pw_errors:
            errors["password"] = pw_errors
        if password != confirm:
            errors["confirm_password"] = "Passwords do not match."

        if col("users").find_one({"email": email}):
            errors["email"] = "An account with this email already exists."

        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        # Create company
        company_doc = {
            "name": company_name,
            "logo": None,
            "created_at": datetime.now(timezone.utc),
        }
        company_result = col("companies").insert_one(company_doc)
        company_id = company_result.inserted_id

        # Create admin user
        user_doc = {
            "email": email,
            "login_id": email,  # admin uses email as login
            "password": hash_password(password),
            "role": "admin",
            "name": name,
            "phone": phone,
            "company_id": company_id,
            "employee_id": None,
            "is_active": True,
            "is_first_login": False,
            "created_at": datetime.now(timezone.utc),
        }
        user_result = col("users").insert_one(user_doc)
        user_doc["_id"] = user_result.inserted_id

        tokens = create_tokens(user_doc)
        return Response({
            "message": "Company and admin account created successfully.",
            "tokens": tokens,
            "user": _serialize_user(user_doc, include_employee=False),
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get("identifier", "").strip()  # email or login_id
        password = request.data.get("password", "")

        if not identifier or not password:
            return Response({"error": "Login ID/Email and password are required."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Find user by email OR login_id
        user_doc = col("users").find_one({
            "$or": [{"email": identifier.lower()}, {"login_id": identifier}]
        })

        if not user_doc:
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        if not user_doc.get("is_active", True):
            return Response({"error": "Your account has been deactivated."},
                            status=status.HTTP_403_FORBIDDEN)

        if not check_password(password, user_doc["password"]):
            return Response({"error": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        tokens = create_tokens(user_doc)
        return Response({
            "tokens": tokens,
            "user": _serialize_user(user_doc),
        })


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response({"error": "Refresh token required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = decode_token(refresh_token)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        if payload.get("type") != "refresh":
            return Response({"error": "Invalid token type."}, status=status.HTTP_400_BAD_REQUEST)

        user_doc = col("users").find_one({"_id": ObjectId(payload["user_id"])})
        if not user_doc:
            return Response({"error": "User not found."}, status=status.HTTP_401_UNAUTHORIZED)

        tokens = create_tokens(user_doc)
        return Response(tokens)


class ChangePasswordView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user: MongoUser = request.user
        current = request.data.get("current_password", "")
        new_pw = request.data.get("new_password", "")
        confirm = request.data.get("confirm_password", "")

        user_doc = col("users").find_one({"_id": ObjectId(user.id)})
        if not user_doc:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if not check_password(current, user_doc["password"]):
            return Response({"errors": {"current_password": "Current password is incorrect."}},
                            status=status.HTTP_400_BAD_REQUEST)

        pw_errors = validate_password_strength(new_pw)
        if pw_errors:
            return Response({"errors": {"new_password": pw_errors}},
                            status=status.HTTP_400_BAD_REQUEST)

        if new_pw != confirm:
            return Response({"errors": {"confirm_password": "Passwords do not match."}},
                            status=status.HTTP_400_BAD_REQUEST)

        col("users").update_one(
            {"_id": ObjectId(user.id)},
            {"$set": {"password": hash_password(new_pw), "is_first_login": False}}
        )

        return Response({"message": "Password changed successfully."})


class MeView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user: MongoUser = request.user
        user_doc = col("users").find_one({"_id": ObjectId(user.id)})
        if not user_doc:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(_serialize_user(user_doc))
