"""
Time Off app views.
- Employees: view own calendar, submit requests, view allocations
- Admin/HR: view all requests, approve/reject, manage allocations, public holidays
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from django.conf import settings as django_settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from core.db import col
from apps.authentication.backends import MongoJWTAuthentication


LEAVE_TYPES = {
    "paid_time_off": {"label": "Paid Time Off", "is_paid": True},
    "sick_leave": {"label": "Sick Leave", "is_paid": True},
    "unpaid_leave": {"label": "Unpaid Leave", "is_paid": False},
}


def _date_diff_days(start: str, end: str) -> int:
    try:
        s = datetime.strptime(start, "%Y-%m-%d")
        e = datetime.strptime(end, "%Y-%m-%d")
        return max(1, (e - s).days + 1)
    except Exception:
        return 1


def serialize_request(doc: dict, include_employee: bool = True) -> dict:
    result = {
        "id": str(doc["_id"]),
        "employee_id": str(doc.get("employee_id", "")),
        "leave_type": doc.get("leave_type", ""),
        "leave_type_label": LEAVE_TYPES.get(doc.get("leave_type", ""), {}).get("label", doc.get("leave_type", "")),
        "start_date": doc.get("start_date", ""),
        "end_date": doc.get("end_date", ""),
        "days": doc.get("days", 1),
        "status": doc.get("status", "pending"),
        "reason": doc.get("reason", ""),
        "attachment": doc.get("attachment"),
        "created_at": doc.get("created_at", "").isoformat() if doc.get("created_at") else None,
        "reviewed_at": doc.get("reviewed_at", "").isoformat() if doc.get("reviewed_at") else None,
        "reviewed_by": doc.get("reviewed_by"),
    }
    if include_employee and doc.get("employee_id"):
        emp = col("employees").find_one({"_id": doc["employee_id"]})
        if emp:
            result["employee_name"] = emp.get("full_name", "")
            result["employee_image"] = emp.get("profile_image")
    return result


def serialize_allocation(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "employee_id": str(doc.get("employee_id", "")),
        "type": doc.get("type", ""),
        "label": doc.get("label", ""),
        "total_days": doc.get("total_days", 0),
        "used_days": doc.get("used_days", 0),
        "remaining_days": doc.get("remaining_days", 0),
        "year": doc.get("year", ""),
    }


class AllocationListView(APIView):
    """View allocations for the current employee or all employees (HR/Admin)."""
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.employee_id:
            docs = list(col("timeoff_allocations").find({"employee_id": ObjectId(user.employee_id)}))
        elif user.is_hr and user.company_id:
            docs = list(col("timeoff_allocations").find({"company_id": ObjectId(user.company_id)}))
        else:
            docs = []
        return Response([serialize_allocation(d) for d in docs])


class TimeOffRequestListView(APIView):
    """
    GET: List requests (employee = own, admin/HR = all)
    POST: Create new request (employee)
    """
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        user = request.user
        search = request.query_params.get("search", "").strip()

        if user.is_hr and user.company_id:
            # Get all employees in company
            emp_ids = [e["_id"] for e in col("employees").find({"company_id": ObjectId(user.company_id)}, {"_id": 1})]
            query = {"employee_id": {"$in": emp_ids}}
            if search:
                import re
                pattern = re.compile(search, re.IGNORECASE)
                matching_emps = [e["_id"] for e in col("employees").find({
                    "company_id": ObjectId(user.company_id),
                    "full_name": {"$regex": pattern},
                })]
                query = {"employee_id": {"$in": matching_emps}}
        elif user.employee_id:
            query = {"employee_id": ObjectId(user.employee_id)}
        else:
            return Response([])

        docs = list(col("timeoff_requests").find(query).sort("created_at", -1))
        return Response([serialize_request(d) for d in docs])

    def post(self, request):
        user = request.user
        if not user.employee_id:
            return Response({"error": "No employee profile found."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        leave_type = data.get("leave_type", "").strip()
        start_date = data.get("start_date", "").strip()
        end_date = data.get("end_date", "").strip()
        reason = data.get("reason", "").strip()

        errors = {}
        if leave_type not in LEAVE_TYPES:
            errors["leave_type"] = f"Invalid leave type. Choose from: {', '.join(LEAVE_TYPES.keys())}"
        if not start_date:
            errors["start_date"] = "Start date is required."
        if not end_date:
            errors["end_date"] = "End date is required."
        if start_date and end_date and start_date > end_date:
            errors["end_date"] = "End date must be on or after start date."

        # Sick leave requires attachment
        if leave_type == "sick_leave" and "attachment" not in request.FILES:
            errors["attachment"] = "Sick leave requires a certificate/document."

        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        days = _date_diff_days(start_date, end_date)

        # Check allocation balance
        alloc = col("timeoff_allocations").find_one({
            "employee_id": ObjectId(user.employee_id),
            "type": leave_type,
        })
        if alloc and alloc.get("remaining_days", 0) < days and leave_type != "unpaid_leave":
            return Response({"error": f"Insufficient balance. Available: {alloc.get('remaining_days', 0)} days."},
                            status=status.HTTP_400_BAD_REQUEST)

        # Handle attachment
        attachment_url = None
        if "attachment" in request.FILES:
            f = request.FILES["attachment"]
            ext = f.name.split(".")[-1]
            filename = f"leave_attachments/{uuid.uuid4()}.{ext}"
            filepath = os.path.join(django_settings.MEDIA_ROOT, filename)
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, "wb+") as dest:
                for chunk in f.chunks():
                    dest.write(chunk)
            attachment_url = f"/media/{filename}"

        doc_data = {
            "employee_id": ObjectId(user.employee_id),
            "leave_type": leave_type,
            "start_date": start_date,
            "end_date": end_date,
            "days": days,
            "reason": reason,
            "attachment": attachment_url,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "reviewed_at": None,
            "reviewed_by": None,
        }

        result = col("timeoff_requests").insert_one(doc_data)
        doc_data["_id"] = result.inserted_id
        return Response(serialize_request(doc_data), status=status.HTTP_201_CREATED)


class TimeOffRequestDetailView(APIView):
    """Approve/reject a request (Admin/HR only)."""
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, request_id):
        doc = col("timeoff_requests").find_one({"_id": ObjectId(request_id)})
        if not doc:
            return Response({"error": "Request not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serialize_request(doc))

    def put(self, request, request_id):
        """Approve or reject a time-off request."""
        user = request.user
        if not user.is_hr:
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        action = request.data.get("action", "").strip()  # "approve" or "reject"
        if action not in ("approve", "reject"):
            return Response({"error": "Action must be 'approve' or 'reject'."}, status=status.HTTP_400_BAD_REQUEST)

        doc = col("timeoff_requests").find_one({"_id": ObjectId(request_id)})
        if not doc:
            return Response({"error": "Request not found."}, status=status.HTTP_404_NOT_FOUND)

        if doc.get("status") != "pending":
            return Response({"error": "Request has already been reviewed."}, status=status.HTTP_400_BAD_REQUEST)

        new_status = "approved" if action == "approve" else "rejected"

        col("timeoff_requests").update_one(
            {"_id": ObjectId(request_id)},
            {"$set": {
                "status": new_status,
                "reviewed_at": datetime.now(timezone.utc),
                "reviewed_by": user.id,
            }}
        )

        # If approved, update allocation
        if new_status == "approved":
            alloc = col("timeoff_allocations").find_one({
                "employee_id": doc["employee_id"],
                "type": doc["leave_type"],
            })
            if alloc:
                new_used = alloc.get("used_days", 0) + doc.get("days", 1)
                new_remaining = max(0, alloc.get("total_days", 0) - new_used)
                col("timeoff_allocations").update_one(
                    {"_id": alloc["_id"]},
                    {"$set": {"used_days": new_used, "remaining_days": new_remaining}}
                )

        doc = col("timeoff_requests").find_one({"_id": ObjectId(request_id)})
        return Response(serialize_request(doc))


class EmployeeCalendarView(APIView):
    """Return all time-off requests for an employee in a given year (for calendar)."""
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        year = request.query_params.get("year", str(datetime.now().year))

        if user.employee_id:
            emp_id = ObjectId(user.employee_id)
        else:
            return Response({"requests": [], "public_holidays": []})

        start = f"{year}-01-01"
        end = f"{year}-12-31"

        docs = list(col("timeoff_requests").find({
            "employee_id": emp_id,
            "$or": [
                {"start_date": {"$gte": start, "$lte": end}},
                {"end_date": {"$gte": start, "$lte": end}},
            ],
        }))

        # Public holidays for the company
        company_id = user.company_id
        holidays = []
        if company_id:
            holidays = list(col("public_holidays").find({
                "company_id": ObjectId(company_id),
                "date": {"$gte": start, "$lte": end},
            }))

        return Response({
            "requests": [serialize_request(d, include_employee=False) for d in docs],
            "public_holidays": [
                {
                    "id": str(h["_id"]),
                    "name": h.get("name", ""),
                    "date": h.get("date", ""),
                }
                for h in holidays
            ],
        })


class PublicHolidayView(APIView):
    """Manage public holidays (Admin only)."""
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        company_id = user.company_id
        year = request.query_params.get("year", str(datetime.now().year))
        query = {"date": {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}}
        if company_id:
            query["company_id"] = ObjectId(company_id)
        docs = list(col("public_holidays").find(query).sort("date", 1))
        return Response([
            {"id": str(h["_id"]), "name": h.get("name", ""), "date": h.get("date", "")}
            for h in docs
        ])

    def post(self, request):
        user = request.user
        if not user.is_admin:
            return Response({"error": "Only admins can add holidays."}, status=status.HTTP_403_FORBIDDEN)

        name = request.data.get("name", "").strip()
        date = request.data.get("date", "").strip()
        if not name or not date:
            return Response({"error": "Name and date are required."}, status=status.HTTP_400_BAD_REQUEST)

        doc = {
            "name": name,
            "date": date,
            "company_id": ObjectId(user.company_id) if user.company_id else None,
            "created_at": datetime.now(timezone.utc),
        }
        result = col("public_holidays").insert_one(doc)
        return Response({"id": str(result.inserted_id), "name": name, "date": date},
                        status=status.HTTP_201_CREATED)

    def delete(self, request, holiday_id):
        user = request.user
        if not user.is_admin:
            return Response({"error": "Only admins can delete holidays."}, status=status.HTTP_403_FORBIDDEN)
        col("public_holidays").delete_one({"_id": ObjectId(holiday_id)})
        return Response({"message": "Holiday deleted."})
