"""Authentication utilities: password hashing, JWT, Login ID generation."""
import os
import re
import random
import string
import bcrypt
from datetime import datetime
from core.db import col


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def check_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def generate_secure_password(length: int = 12) -> str:
    """Generate a password satisfying: upper, lower, digit, special char."""
    upper = random.choices(string.ascii_uppercase, k=2)
    lower = random.choices(string.ascii_lowercase, k=4)
    digits = random.choices(string.digits, k=3)
    special = random.choices("@#$%!&*", k=3)
    all_chars = upper + lower + digits + special
    random.shuffle(all_chars)
    return "".join(all_chars)


def validate_password_strength(password: str) -> list[str]:
    """Return list of errors. Empty list = valid."""
    errors = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", password):
        errors.append("Password must contain at least one digit.")
    if not re.search(r"[@#$%!&*]", password):
        errors.append("Password must contain at least one special character (@#$%!&*).")
    return errors


def generate_login_id(company_name: str, first_name: str, last_name: str, year: int) -> str:
    """
    Format: {PREFIX}{FN2}{LN2}{YEAR}{SERIAL:04d}
    PREFIX = first 2 uppercase initials of company name words (e.g. "Odoo India" -> "OI")
    FN2    = first 2 letters of first name (uppercase)
    LN2    = first 2 letters of last name (uppercase)
    YEAR   = 4-digit joining year
    SERIAL = next serial for that year (padded to 4 digits)
    """
    # Company prefix: take first letter of each word, max 2
    words = [w for w in company_name.split() if w]
    prefix = "".join(w[0].upper() for w in words[:2])
    if len(prefix) < 2:
        prefix = prefix.ljust(2, "X")

    fn2 = (first_name[:2].upper()).ljust(2, "X")
    ln2 = (last_name[:2].upper()).ljust(2, "X")

    # Determine next serial for this year
    year_str = str(year)
    count = col("employees").count_documents({"joining_year": year_str})
    serial = count + 1

    return f"{prefix}{fn2}{ln2}{year_str}{serial:04d}"


def get_next_serial(year: str) -> int:
    count = col("employees").count_documents({"joining_year": year})
    return count + 1
