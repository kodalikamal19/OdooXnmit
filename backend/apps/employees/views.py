"""
Employees app views.
Handles CRUD for employees, profile images, resume, skills, certifications.
Only Admin/HR can create employees.
"""
import os
import uuid
from datetime import datetime, timezone
from bson import ObjectId
from django.conf import settings as django_settings
from django.core.mail import send_mail
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from core.db import col
from apps.authentication.backends import MongoJWTAuthentication
from apps.authentication.utils import (
    hash_password, generate_secure_password, generate_login_id,
)


def _save_file(file_obj, subfolder: str) -> str:
    """Save an uploaded file and return the media URL path."""
    ext = file_obj.name.split(".")[-1]
    filename = f"{subfolder}/{uuid.uuid4()}.{ext}"
    filepath = os.path.join(django_settings.MEDIA_ROOT, filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "wb+") as f:
        for chunk in file_obj.chunks():
            f.write(chunk)
    return f"/media/{filename}"


def _attendance_status(employee_id: str) -> str:
    """Return 'present', 'on_leave', or 'absent' for today."""
    today = datetime.now(timezone.utc).date().isoformat()
    # Check attendance
    att = col("attendance").find_one({
        "employee_id": ObjectId(employee_id),
        "date": today,
    })
    if att and att.get("check_in"):
        return "present"
    # Check approved leave
    leave = col("timeoff_requests").find_one({
        "employee_id": ObjectId(employee_id),
        "status": "approved",
        "start_date": {"$lte": today},
        "end_date": {"$gte": today},
    })
    if leave:
        return "on_leave"
    return "absent"


def serialize_employee(doc: dict, include_status: bool = True) -> dict:
    result = {
        "id": str(doc["_id"]),
        "full_name": doc.get("full_name", ""),
        "first_name": doc.get("first_name", ""),
        "last_name": doc.get("last_name", ""),
        "login_id": doc.get("login_id", ""),
        "email": doc.get("email", ""),
        "phone": doc.get("phone", ""),
        "department": doc.get("department", ""),
        "job_position": doc.get("job_position", ""),
        "manager": doc.get("manager", ""),
        "location": doc.get("location", ""),
        "date_of_joining": doc.get("date_of_joining", ""),
        "joining_year": doc.get("joining_year", ""),
        "profile_image": doc.get("profile_image"),
        "company_id": str(doc.get("company_id", "")) if doc.get("company_id") else None,
        "user_id": str(doc.get("user_id", "")) if doc.get("user_id") else None,
        "employee_code": doc.get("employee_code", ""),
        # Resume
        "resume": doc.get("resume", {}),
        # Private Info (HR/Admin)
        "about_job": doc.get("about_job", ""),
        "interests": doc.get("interests", []),
        "hobbies": doc.get("hobbies", []),
        "skills": doc.get("skills", []),
        "certifications": doc.get("certifications", []),
        # Private Info (Employee)
        "date_of_birth": doc.get("date_of_birth", ""),
        "address": doc.get("address", ""),
        "nationality": doc.get("nationality", ""),
        "personal_email": doc.get("personal_email", ""),
        "gender": doc.get("gender", ""),
        "marital_status": doc.get("marital_status", ""),
        # Bank details
        "bank_account": doc.get("bank_account", ""),
        "bank_name": doc.get("bank_name", ""),
        "ifsc_code": doc.get("ifsc_code", ""),
        "pan_number": doc.get("pan_number", ""),
        "created_at": doc.get("created_at", "").isoformat() if doc.get("created_at") else None,
    }
    if include_status:
        result["attendance_status"] = _attendance_status(str(doc["_id"]))
    return result


class EmployeeListView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        user = request.user
        search = request.query_params.get("search", "").strip()
        company_id = user.company_id

        query = {"company_id": ObjectId(company_id)} if company_id else {}
        if search:
            import re
            pattern = re.compile(search, re.IGNORECASE)
            query["$or"] = [
                {"full_name": {"$regex": pattern}},
                {"department": {"$regex": pattern}},
                {"job_position": {"$regex": pattern}},
                {"email": {"$regex": pattern}},
            ]

        docs = list(col("employees").find(query).sort("full_name", 1))
        return Response([serialize_employee(d) for d in docs])

    def post(self, request):
        """Create a new employee. Admin/HR only."""
        user = request.user
        if not user.is_hr:
            return Response({"error": "Only Admin or HR Officers can create employees."},
                            status=status.HTTP_403_FORBIDDEN)

        data = request.data
        first_name = data.get("first_name", "").strip()
        last_name = data.get("last_name", "").strip()
        email = data.get("email", "").strip().lower()
        phone = data.get("phone", "").strip()
        department = data.get("department", "").strip()
        job_position = data.get("job_position", "").strip()
        manager = data.get("manager", "").strip()
        location = data.get("location", "").strip()
        date_of_joining = data.get("date_of_joining", "").strip()

        # Validate
        errors = {}
        if not first_name:
            errors["first_name"] = "First name is required."
        if not last_name:
            errors["last_name"] = "Last name is required."
        if not email or "@" not in email:
            errors["email"] = "Valid email is required."
        if col("users").find_one({"email": email}):
            errors["email"] = "An account with this email already exists."
        if errors:
            return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        # Determine company
        company_id = ObjectId(user.company_id) if user.company_id else None
        company_doc = col("companies").find_one({"_id": company_id}) if company_id else None
        company_name = company_doc["name"] if company_doc else "Company"

        # Joining year
        if date_of_joining:
            try:
                joining_dt = datetime.strptime(date_of_joining, "%Y-%m-%d")
                year = joining_dt.year
            except ValueError:
                year = datetime.now().year
        else:
            year = datetime.now().year

        # Generate Login ID
        login_id = generate_login_id(company_name, first_name, last_name, year)

        # Generate password
        plain_password = generate_secure_password()
        hashed = hash_password(plain_password)

        # Employee code (same as login_id for now)
        employee_code = login_id

        full_name = f"{first_name} {last_name}"

        # Handle profile image upload
        profile_image = None
        if "profile_image" in request.FILES:
            profile_image = _save_file(request.FILES["profile_image"], "profile_images")

        # Create employee doc
        emp_doc = {
            "first_name": first_name,
            "last_name": last_name,
            "full_name": full_name,
            "email": email,
            "phone": phone,
            "department": department,
            "job_position": job_position,
            "manager": manager,
            "location": location,
            "date_of_joining": date_of_joining,
            "joining_year": str(year),
            "login_id": login_id,
            "employee_code": employee_code,
            "profile_image": profile_image,
            "company_id": company_id,
            "user_id": None,  # will update after user creation
            # Resume
            "resume": {},
            # Private Info
            "about_job": "",
            "interests": [],
            "hobbies": [],
            "skills": [],
            "certifications": [],
            # Personal Info
            "date_of_birth": "",
            "address": "",
            "nationality": "",
            "personal_email": "",
            "gender": "",
            "marital_status": "",
            # Bank
            "bank_account": "",
            "bank_name": "",
            "ifsc_code": "",
            "pan_number": "",
            "created_at": datetime.now(timezone.utc),
        }

        emp_result = col("employees").insert_one(emp_doc)
        emp_id = emp_result.inserted_id

        # Create user account for the employee
        user_doc = {
            "email": email,
            "login_id": login_id,
            "password": hashed,
            "role": "employee",
            "name": full_name,
            "phone": phone,
            "company_id": company_id,
            "employee_id": emp_id,
            "is_active": True,
            "is_first_login": True,
            "created_at": datetime.now(timezone.utc),
        }
        user_result = col("users").insert_one(user_doc)

        # Link employee → user
        col("employees").update_one({"_id": emp_id}, {"$set": {"user_id": user_result.inserted_id}})

        # Create default time off allocations for the employee
        _create_default_allocations(emp_id, company_id)

        # Send credentials email
        _send_credentials_email(email, full_name, login_id, plain_password)

        emp_doc["_id"] = emp_id
        emp_doc["user_id"] = user_result.inserted_id
        
        # Add generated password to the response so the frontend can display it
        response_data = serialize_employee(emp_doc)
        response_data["generated_password"] = plain_password
        
        return Response(response_data, status=status.HTTP_201_CREATED)


def _create_default_allocations(employee_id, company_id):
    """Create default time off allocations for new employee."""
    defaults = [
        {"type": "paid_time_off", "label": "Paid Time Off", "total_days": 24, "used_days": 0},
        {"type": "sick_leave", "label": "Sick Time Off", "total_days": 7, "used_days": 0},
        {"type": "unpaid_leave", "label": "Unpaid Leave", "total_days": 30, "used_days": 0},
    ]
    now = datetime.now(timezone.utc)
    for alloc in defaults:
        col("timeoff_allocations").insert_one({
            "employee_id": employee_id,
            "company_id": company_id,
            "type": alloc["type"],
            "label": alloc["label"],
            "total_days": alloc["total_days"],
            "used_days": alloc["used_days"],
            "remaining_days": alloc["total_days"],
            "year": str(now.year),
            "created_at": now,
        })


def _send_credentials_email(email: str, name: str, login_id: str, password: str):
    """Send generated credentials to employee email."""
    subject = "Welcome to OdooXnmit HR — Your Login Credentials"
    message = f"""
Dear {name},

Welcome to the OdooXnmit HR Management System!

Your account has been created. Here are your login credentials:

Login ID: {login_id}
Password: {password}

Please log in at: {django_settings.FRONTEND_URL}

IMPORTANT: You will be prompted to change your password upon first login.

If you have any questions, please contact your HR department.

Best regards,
OdooXnmit HR Team
"""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=django_settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        print(f"[Email Error] Failed to send credentials to {email}: {e}")


class EmployeeDetailView(APIView):
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, employee_id):
        user = request.user
        try:
            doc = col("employees").find_one({"_id": ObjectId(employee_id)})
        except Exception:
            return Response({"error": "Invalid employee ID."}, status=status.HTTP_400_BAD_REQUEST)

        if not doc:
            return Response({"error": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)

        # Employees can only view their own profile
        if not user.is_hr and str(doc.get("user_id", "")) != user.id:
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        return Response(serialize_employee(doc))

    def put(self, request, employee_id):
        user = request.user
        try:
            doc = col("employees").find_one({"_id": ObjectId(employee_id)})
        except Exception:
            return Response({"error": "Invalid employee ID."}, status=status.HTTP_400_BAD_REQUEST)

        if not doc:
            return Response({"error": "Employee not found."}, status=status.HTTP_404_NOT_FOUND)

        # Employees can only update their own private info (limited fields)
        is_own_profile = str(doc.get("user_id", "")) == user.id

        if not user.is_hr and not is_own_profile:
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        updates = {}

        if user.is_hr:
            # HR/Admin can update all fields
            hr_fields = [
                "first_name", "last_name", "email", "phone", "department",
                "job_position", "manager", "location", "date_of_joining",
                "about_job", "interests", "hobbies",
                "bank_account", "bank_name", "ifsc_code", "pan_number",
            ]
            for field in hr_fields:
                if field in data:
                    updates[field] = data[field]

            if "first_name" in updates or "last_name" in updates:
                fn = updates.get("first_name", doc.get("first_name", ""))
                ln = updates.get("last_name", doc.get("last_name", ""))
                updates["full_name"] = f"{fn} {ln}"

        # Employees can update these personal fields
        personal_fields = [
            "date_of_birth", "address", "nationality", "personal_email",
            "gender", "marital_status",
        ]
        for field in personal_fields:
            if field in data:
                updates[field] = data[field]

        # Resume (HR/Admin only)
        if user.is_hr and "resume" in data:
            updates["resume"] = data["resume"]

        # Profile image
        if "profile_image" in request.FILES:
            updates["profile_image"] = _save_file(request.FILES["profile_image"], "profile_images")

        if updates:
            col("employees").update_one({"_id": ObjectId(employee_id)}, {"$set": updates})

        doc = col("employees").find_one({"_id": ObjectId(employee_id)})
        return Response(serialize_employee(doc))


class EmployeeSkillsView(APIView):
    """Add/remove skills for an employee (HR/Admin only)."""
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, employee_id):
        if not request.user.is_hr:
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        skill = request.data.get("skill", "").strip()
        if not skill:
            return Response({"error": "Skill is required."}, status=status.HTTP_400_BAD_REQUEST)

        col("employees").update_one(
            {"_id": ObjectId(employee_id)},
            {"$addToSet": {"skills": skill}}
        )
        doc = col("employees").find_one({"_id": ObjectId(employee_id)})
        return Response({"skills": doc.get("skills", [])})

    def delete(self, request, employee_id):
        if not request.user.is_hr:
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        skill = request.data.get("skill", "").strip()
        col("employees").update_one(
            {"_id": ObjectId(employee_id)},
            {"$pull": {"skills": skill}}
        )
        doc = col("employees").find_one({"_id": ObjectId(employee_id)})
        return Response({"skills": doc.get("skills", [])})


class EmployeeCertificationsView(APIView):
    """Add/remove certifications (HR/Admin only)."""
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, employee_id):
        if not request.user.is_hr:
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        cert = {
            "id": str(uuid.uuid4()),
            "name": request.data.get("name", ""),
            "issuer": request.data.get("issuer", ""),
            "date": request.data.get("date", ""),
        }
        if not cert["name"]:
            return Response({"error": "Certification name is required."}, status=status.HTTP_400_BAD_REQUEST)

        col("employees").update_one(
            {"_id": ObjectId(employee_id)},
            {"$push": {"certifications": cert}}
        )
        doc = col("employees").find_one({"_id": ObjectId(employee_id)})
        return Response({"certifications": doc.get("certifications", [])})

    def delete(self, request, employee_id):
        if not request.user.is_hr:
            return Response({"error": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        cert_id = request.data.get("id", "")
        col("employees").update_one(
            {"_id": ObjectId(employee_id)},
            {"$pull": {"certifications": {"id": cert_id}}}
        )
        doc = col("employees").find_one({"_id": ObjectId(employee_id)})
        return Response({"certifications": doc.get("certifications", [])})


class MyEmployeeProfileView(APIView):
    """Get the logged-in employee's own profile."""
    authentication_classes = [MongoJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not user.employee_id:
            return Response({"error": "No employee profile found."}, status=status.HTTP_404_NOT_FOUND)
        doc = col("employees").find_one({"_id": ObjectId(user.employee_id)})
        if not doc:
            return Response({"error": "Employee profile not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serialize_employee(doc))
