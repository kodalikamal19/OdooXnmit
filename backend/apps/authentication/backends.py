"""
Custom JWT authentication backend that reads users from MongoDB.
Works with djangorestframework-simplejwt by overriding token validation.
"""
import os
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class MongoUser:
    """Lightweight user object compatible with DRF permission checks."""

    def __init__(self, doc: dict):
        self._doc = doc
        self.id = str(doc["_id"])
        self.pk = self.id
        self.email = doc.get("email", "")
        self.login_id = doc.get("login_id", "")
        self.role = doc.get("role", "employee")
        self.is_authenticated = True
        self.is_active = doc.get("is_active", True)
        self.employee_id = str(doc.get("employee_id", "")) if doc.get("employee_id") else None
        self.company_id = str(doc.get("company_id", "")) if doc.get("company_id") else None

    def has_perm(self, perm, obj=None):
        return self.role in ("admin", "hr_officer")

    def has_module_perms(self, app_label):
        return True

    @property
    def is_admin(self):
        return self.role == "admin"

    @property
    def is_hr(self):
        return self.role in ("admin", "hr_officer")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "login_id": self.login_id,
            "role": self.role,
            "employee_id": self.employee_id,
            "company_id": self.company_id,
        }


def create_tokens(user_doc: dict) -> dict:
    """Create access + refresh JWT tokens for a MongoDB user doc."""
    user_id = str(user_doc["_id"])
    now = datetime.now(timezone.utc)

    access_payload = {
        "user_id": user_id,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(hours=8),
    }
    refresh_payload = {
        "user_id": user_id,
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=7),
    }

    secret = settings.SECRET_KEY
    access = jwt.encode(access_payload, secret, algorithm="HS256")
    refresh = jwt.encode(refresh_payload, secret, algorithm="HS256")

    return {"access": access, "refresh": refresh}


def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Returns payload dict."""
    secret = settings.SECRET_KEY
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationFailed("Token has expired.")
    except jwt.InvalidTokenError:
        raise AuthenticationFailed("Invalid token.")


class MongoJWTAuthentication(BaseAuthentication):
    """DRF authentication class using our custom JWT + MongoDB user lookup."""

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ", 1)[1]
        try:
            payload = decode_token(token)
        except AuthenticationFailed:
            raise

        if payload.get("type") != "access":
            raise AuthenticationFailed("Invalid token type.")

        from core.db import col
        user_doc = col("users").find_one({"_id": ObjectId(payload["user_id"])})
        if not user_doc:
            raise AuthenticationFailed("User not found.")

        if not user_doc.get("is_active", True):
            raise AuthenticationFailed("User account is disabled.")

        return (MongoUser(user_doc), token)

    def authenticate_header(self, request):
        return "Bearer"
