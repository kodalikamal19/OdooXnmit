"""
Attendance app views.
- Employees: check-in/check-out, view own attendance (monthly)
- Admin/HR: view all employee attendance by date, search
"""
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.db import col
from apps.authentication.backends import MongoJWTAuthentication


def _calc_work_hours(check_in_str: str, check_out_str: str, break_minutes: int = 0) -> dict:
    """Calculate work hours and extra hours given check-in/out strings (ISO format)."""
    try:
        ci = datetime.fromisoformat(check_in_str)
        co = datetime.fromisoformat(check_out_str)
        total_minutes = (co - ci).total_seconds() / 60
        total_minutes -= break_minutes
        total_minutes = max(0, total_minutes)

        # Assume 8-hour workday = 480 min
        standard_minutes = 480
        extra_minutes = max(0, total_minutes - standard_minutes)

        def fmt(mins):
            h = int(mins // 60)
            m = int(mins % 60)
            return f"{h:02d}:{m:02d}"

        return {
            "work_hours": fmt(total_minutes),
            "work_minutes": total_minutes,
            "extra_hours": fmt(extra_minutes),
            "extra_minutes": extra_minutes,
        }
    except Exception:
        return {"work_hours": "00:00", "work_minutes": 0, "extra_hours": "00:00", "extra_minutes": 0}


def serialize_attendance(doc: dict, include_employee: bool = False) -> dict:
    result = {
        "id": str(doc["_id"]),
        "employee_id": str(doc.get("employee_id", "")),
        "date": doc.get("date", ""),
        "check_in": doc.get("check_in"),
        "check_out": doc.get("check_out"),
        "work_hours": doc.get("work_hours", "00:00"),
        "extra_hours": doc.get("extra_hours", "00:00"),
        "break_minutes": doc.get("break_minutes", 0),
        "status": doc.get("status", "present"),
    }
    if include_employee and doc.get("employee_id"):
        emp = col("employees").find_one({"_id": doc["employee_id"]})
        if emp:
            result["employee_name"] = emp.get("full_name", "")
            result["employee_image"] = emp.get("profile_image")
            result["employee_code"] = emp.get("employee_code", "")
            result["department"] = emp.get("department", "")
    return result


class CheckInView(APIView):
    """Employee checks in."""
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.employee_id:
            return Response({"error": "No employee profile found."}, status=status.HTTP_400_BAD_REQUEST)

        today = datetime.now(timezone.utc).date().isoformat()
        now_iso = datetime.now(timezone.utc).isoformat()

        existing = col("attendance").find_one({
            "employee_id": ObjectId(user.employee_id),
            "date": today,
        })

        if existing and existing.get("check_in"):
            return Response({"error": "Already checked in today."}, status=status.HTTP_400_BAD_REQUEST)

        if existing:
            col("attendance").update_one(
                {"_id": existing["_id"]},
                {"$set": {"check_in": now_iso, "status": "present"}}
            )
            doc = col("attendance").find_one({"_id": existing["_id"]})
        else:
            doc_data = {
                "employee_id": ObjectId(user.employee_id),
                "date": today,
                "check_in": now_iso,
                "check_out": None,
                "work_hours": "00:00",
                "extra_hours": "00:00",
                "break_minutes": 0,
                "status": "present",
                "created_at": datetime.now(timezone.utc),
            }
            result = col("attendance").insert_one(doc_data)
            doc = col("attendance").find_one({"_id": result.inserted_id})

        return Response({"message": "Checked in successfully.", "attendance": serialize_attendance(doc)})


class CheckOutView(APIView):
    """Employee checks out."""
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.employee_id:
            return Response({"error": "No employee profile found."}, status=status.HTTP_400_BAD_REQUEST)

        today = datetime.now(timezone.utc).date().isoformat()
        now_iso = datetime.now(timezone.utc).isoformat()

        existing = col("attendance").find_one({
            "employee_id": ObjectId(user.employee_id),
            "date": today,
        })

        if not existing or not existing.get("check_in"):
            return Response({"error": "You haven't checked in today."}, status=status.HTTP_400_BAD_REQUEST)

        if existing.get("check_out"):
            return Response({"error": "Already checked out today."}, status=status.HTTP_400_BAD_REQUEST)

        hours_data = _calc_work_hours(existing["check_in"], now_iso, existing.get("break_minutes", 0))

        col("attendance").update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "check_out": now_iso,
                "work_hours": hours_data["work_hours"],
                "extra_hours": hours_data["extra_hours"],
            }}
        )
        doc = col("attendance").find_one({"_id": existing["_id"]})
        return Response({"message": "Checked out successfully.", "attendance": serialize_attendance(doc)})


class TodayAttendanceStatusView(APIView):
    """Get the current user's attendance status for today."""
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.employee_id:
            return Response({"checked_in": False, "checked_out": False, "attendance": None})

        today = datetime.now(timezone.utc).date().isoformat()
        doc = col("attendance").find_one({
            "employee_id": ObjectId(user.employee_id),
            "date": today,
        })

        if not doc:
            return Response({"checked_in": False, "checked_out": False, "attendance": None})

        return Response({
            "checked_in": bool(doc.get("check_in")),
            "checked_out": bool(doc.get("check_out")),
            "attendance": serialize_attendance(doc),
        })


class EmployeeAttendanceView(APIView):
    """Employee's own attendance records (monthly view)."""
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.employee_id:
            return Response({"error": "No employee profile."}, status=status.HTTP_400_BAD_REQUEST)

        # Month param: ?year=2025&month=10
        year = int(request.query_params.get("year", datetime.now().year))
        month = int(request.query_params.get("month", datetime.now().month))

        # Date range for the month
        from calendar import monthrange
        _, last_day = monthrange(year, month)
        start_date = f"{year}-{month:02d}-01"
        end_date = f"{year}-{month:02d}-{last_day:02d}"

        docs = list(col("attendance").find({
            "employee_id": ObjectId(user.employee_id),
            "date": {"$gte": start_date, "$lte": end_date},
        }).sort("date", 1))

        # Count approved leaves for the month
        leaves = list(col("timeoff_requests").find({
            "employee_id": ObjectId(user.employee_id),
            "status": "approved",
            "$or": [
                {"start_date": {"$gte": start_date, "$lte": end_date}},
                {"end_date": {"$gte": start_date, "$lte": end_date}},
            ],
        }))

        present_count = len([d for d in docs if d.get("check_in")])
        leave_days = sum(int(l.get("days", 1)) for l in leaves)
        total_working_days = last_day  # simplified; could exclude weekends

        return Response({
            "year": year,
            "month": month,
            "present_count": present_count,
            "leave_count": leave_days,
            "total_working_days": total_working_days,
            "records": [serialize_attendance(d) for d in docs],
        })


class AdminAttendanceView(APIView):
    """Admin/HR attendance view: all employees for a given date."""
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.is_hr:
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        date_str = request.query_params.get("date", datetime.now(timezone.utc).date().isoformat())
        search = request.query_params.get("search", "").strip()

        # Find all employees in the company
        emp_query = {"company_id": ObjectId(user.company_id)} if user.company_id else {}
        if search:
            import re
            pattern = re.compile(search, re.IGNORECASE)
            emp_query["$or"] = [
                {"full_name": {"$regex": pattern}},
                {"department": {"$regex": pattern}},
            ]

        employees = list(col("employees").find(emp_query))

        results = []
        for emp in employees:
            att = col("attendance").find_one({
                "employee_id": emp["_id"],
                "date": date_str,
            })
            if att:
                record = serialize_attendance(att)
                record["employee_name"] = emp.get("full_name", "")
                record["employee_image"] = emp.get("profile_image")
                record["department"] = emp.get("department", "")
                record["employee_code"] = emp.get("employee_code", "")
                results.append(record)
            else:
                results.append({
                    "id": None,
                    "employee_id": str(emp["_id"]),
                    "employee_name": emp.get("full_name", ""),
                    "employee_image": emp.get("profile_image"),
                    "department": emp.get("department", ""),
                    "employee_code": emp.get("employee_code", ""),
                    "date": date_str,
                    "check_in": None,
                    "check_out": None,
                    "work_hours": "00:00",
                    "extra_hours": "00:00",
                    "status": "absent",
                })

        return Response({"date": date_str, "records": results})
