"""
Payroll app views.
Handles salary information, automatic salary component calculation,
and payable day calculation based on attendance + leave.
"""
from datetime import datetime, timezone
from bson import ObjectId
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from core.db import col
from apps.authentication.backends import MongoJWTAuthentication


def _calc_components(monthly_wage: float, component_config: dict) -> dict:
    """
    Auto-calculate salary components from monthly wage.
    component_config: {component_key: percentage (0-100)}
    Returns dict of component_key -> amount
    """
    result = {}
    for key, pct in component_config.items():
        result[key] = round((pct / 100) * monthly_wage, 2)
    return result


# Default salary component percentages
DEFAULT_COMPONENTS = {
    "basic_salary": 50.0,
    "house_rent_allowance": 20.0,
    "standard_allowance": 5.0,
    "performance_bonus": 10.0,
    "leave_travel_allowance": 8.0,
    "fixed_allowance": 7.0,
}

DEFAULT_PF = {
    "employee_pf_percentage": 12.0,
    "employer_pf_percentage": 12.0,
    "professional_tax": 200.0,  # Fixed amount per month (INR)
}


def serialize_salary(doc: dict) -> dict:
    monthly_wage = doc.get("monthly_wage", 0.0)
    component_config = doc.get("component_percentages", DEFAULT_COMPONENTS)
    components = _calc_components(monthly_wage, component_config)

    pf_config = doc.get("pf_config", DEFAULT_PF)
    emp_pf = round((pf_config.get("employee_pf_percentage", 12) / 100) * components.get("basic_salary", 0), 2)
    employer_pf = round((pf_config.get("employer_pf_percentage", 12) / 100) * components.get("basic_salary", 0), 2)
    prof_tax = pf_config.get("professional_tax", 200.0)

    return {
        "id": str(doc["_id"]),
        "employee_id": str(doc.get("employee_id", "")),
        "monthly_wage": monthly_wage,
        "yearly_wage": round(monthly_wage * 12, 2),
        "working_days_per_week": doc.get("working_days_per_week", 5),
        "break_time_minutes": doc.get("break_time_minutes", 60),
        "working_schedule": doc.get("working_schedule", "9:00 AM - 6:00 PM"),
        "wage_type": doc.get("wage_type", "monthly"),
        "component_percentages": component_config,
        "components": {
            "basic_salary": components.get("basic_salary", 0),
            "house_rent_allowance": components.get("house_rent_allowance", 0),
            "standard_allowance": components.get("standard_allowance", 0),
            "performance_bonus": components.get("performance_bonus", 0),
            "leave_travel_allowance": components.get("leave_travel_allowance", 0),
            "fixed_allowance": components.get("fixed_allowance", 0),
        },
        "provident_fund": {
            "employee_pf_percentage": pf_config.get("employee_pf_percentage", 12),
            "employer_pf_percentage": pf_config.get("employer_pf_percentage", 12),
            "employee_pf_amount": emp_pf,
            "employer_pf_amount": employer_pf,
            "professional_tax": prof_tax,
        },
        "updated_at": doc.get("updated_at", "").isoformat() if doc.get("updated_at") else None,
    }


class SalaryInfoView(APIView):
    """Get/create/update salary info for an employee."""
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, employee_id):
        user = request.user
        # Employees can view their own salary info; HR/Admin can view all
        if not user.is_hr and user.employee_id != employee_id:
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        doc = col("salary_info").find_one({"employee_id": ObjectId(employee_id)})
        if not doc:
            # Return defaults with 0 wage
            defaults = {
                "_id": ObjectId(),
                "employee_id": ObjectId(employee_id),
                "monthly_wage": 0.0,
                "working_days_per_week": 5,
                "break_time_minutes": 60,
                "working_schedule": "9:00 AM - 6:00 PM",
                "wage_type": "monthly",
                "component_percentages": DEFAULT_COMPONENTS.copy(),
                "pf_config": DEFAULT_PF.copy(),
                "updated_at": None,
            }
            return Response(serialize_salary(defaults))

        return Response(serialize_salary(doc))

    def put(self, request, employee_id):
        user = request.user
        if not user.is_hr:
            return Response({"error": "Only Admin/HR can update salary info."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        updates = {}

        if "monthly_wage" in data:
            try:
                updates["monthly_wage"] = float(data["monthly_wage"])
            except (ValueError, TypeError):
                return Response({"error": "Invalid wage value."}, status=status.HTTP_400_BAD_REQUEST)

        if "working_days_per_week" in data:
            updates["working_days_per_week"] = int(data["working_days_per_week"])

        if "break_time_minutes" in data:
            updates["break_time_minutes"] = int(data["break_time_minutes"])

        if "working_schedule" in data:
            updates["working_schedule"] = data["working_schedule"]

        if "wage_type" in data:
            updates["wage_type"] = data["wage_type"]

        if "component_percentages" in data:
            updates["component_percentages"] = data["component_percentages"]

        if "pf_config" in data:
            updates["pf_config"] = data["pf_config"]

        updates["updated_at"] = datetime.now(timezone.utc)

        existing = col("salary_info").find_one({"employee_id": ObjectId(employee_id)})
        if existing:
            col("salary_info").update_one({"_id": existing["_id"]}, {"$set": updates})
            doc = col("salary_info").find_one({"_id": existing["_id"]})
        else:
            updates["employee_id"] = ObjectId(employee_id)
            updates.setdefault("monthly_wage", 0.0)
            updates.setdefault("component_percentages", DEFAULT_COMPONENTS.copy())
            updates.setdefault("pf_config", DEFAULT_PF.copy())
            result = col("salary_info").insert_one(updates)
            doc = col("salary_info").find_one({"_id": result.inserted_id})

        return Response(serialize_salary(doc))


class PayableCalculationView(APIView):
    """
    Calculate payable days for an employee in a given month.
    Based on attendance + approved leaves.
    """
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, employee_id):
        user = request.user
        if not user.is_hr and user.employee_id != employee_id:
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        year = int(request.query_params.get("year", datetime.now().year))
        month = int(request.query_params.get("month", datetime.now().month))
        from calendar import monthrange
        _, last_day = monthrange(year, month)
        start_date = f"{year}-{month:02d}-01"
        end_date = f"{year}-{month:02d}-{last_day:02d}"

        # Total working days (excluding weekends in a 5-day week — simplified)
        salary_doc = col("salary_info").find_one({"employee_id": ObjectId(employee_id)})
        working_days_per_week = salary_doc.get("working_days_per_week", 5) if salary_doc else 5

        # Count days employee was present
        present_records = list(col("attendance").find({
            "employee_id": ObjectId(employee_id),
            "date": {"$gte": start_date, "$lte": end_date},
            "check_in": {"$ne": None},
        }))
        present_days = len(present_records)

        # Count approved paid leaves
        paid_leaves = list(col("timeoff_requests").find({
            "employee_id": ObjectId(employee_id),
            "status": "approved",
            "leave_type": {"$in": ["paid_time_off", "sick_leave"]},
            "$or": [
                {"start_date": {"$gte": start_date, "$lte": end_date}},
                {"end_date": {"$gte": start_date, "$lte": end_date}},
            ],
        }))
        paid_leave_days = sum(l.get("days", 1) for l in paid_leaves)

        # Count approved unpaid leaves
        unpaid_leaves = list(col("timeoff_requests").find({
            "employee_id": ObjectId(employee_id),
            "status": "approved",
            "leave_type": "unpaid_leave",
            "$or": [
                {"start_date": {"$gte": start_date, "$lte": end_date}},
                {"end_date": {"$gte": start_date, "$lte": end_date}},
            ],
        }))
        unpaid_leave_days = sum(l.get("days", 1) for l in unpaid_leaves)

        payable_days = present_days + paid_leave_days

        # Calculate payable salary
        salary_info = col("salary_info").find_one({"employee_id": ObjectId(employee_id)})
        monthly_wage = salary_info.get("monthly_wage", 0) if salary_info else 0
        per_day_wage = monthly_wage / last_day if last_day > 0 else 0
        payable_salary = round(per_day_wage * payable_days, 2)

        return Response({
            "year": year,
            "month": month,
            "total_calendar_days": last_day,
            "present_days": present_days,
            "paid_leave_days": paid_leave_days,
            "unpaid_leave_days": unpaid_leave_days,
            "payable_days": payable_days,
            "monthly_wage": monthly_wage,
            "per_day_wage": round(per_day_wage, 2),
            "payable_salary": payable_salary,
        })
