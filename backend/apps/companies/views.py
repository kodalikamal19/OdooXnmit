"""Companies app views."""
import os
from datetime import datetime, timezone
from bson import ObjectId
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from core.db import col
from apps.authentication.backends import MongoJWTAuthentication


def serialize_company(doc):
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "logo": doc.get("logo"),
        "created_at": doc.get("created_at", "").isoformat() if doc.get("created_at") else None,
    }


class CompanyListView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        company_id = user.company_id
        if not company_id:
            return Response({"error": "No company found."}, status=status.HTTP_404_NOT_FOUND)
        doc = col("companies").find_one({"_id": ObjectId(company_id)})
        if not doc:
            return Response({"error": "Company not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serialize_company(doc))


class CompanyUpdateView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def put(self, request, company_id):
        user = request.user
        if not user.is_admin:
            return Response({"error": "Only admins can update company info."},
                            status=status.HTTP_403_FORBIDDEN)

        updates = {}
        if "name" in request.data:
            updates["name"] = request.data["name"]

        if "logo" in request.FILES:
            logo_file = request.FILES["logo"]
            from django.conf import settings as django_settings
            import uuid
            ext = logo_file.name.split(".")[-1]
            filename = f"company_logos/{uuid.uuid4()}.{ext}"
            filepath = os.path.join(django_settings.MEDIA_ROOT, filename)
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, "wb+") as f:
                for chunk in logo_file.chunks():
                    f.write(chunk)
            updates["logo"] = f"/media/{filename}"

        if updates:
            col("companies").update_one({"_id": ObjectId(company_id)}, {"$set": updates})

        doc = col("companies").find_one({"_id": ObjectId(company_id)})
        return Response(serialize_company(doc))
