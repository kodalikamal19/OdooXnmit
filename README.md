# OdooXnmit HR Management System

A full-stack, enterprise-grade HR Management System built with Django, MongoDB, and React. 

## Project Structure
- `backend/` - Django REST Framework API powered by PyMongo.
- `frontend/` - React application built with Vite and TypeScript.

---

## Prerequisites
Before you begin, ensure you have the following installed on your machine:
- **Python** (v3.10+)
- **Node.js** (v18+)
- **npm** or **yarn**
- **MongoDB** (Local instance running on `localhost:27017` or a MongoDB Atlas URI)

---

## 1. Backend Setup (Django)

Open a terminal and navigate to the root of the project, then run the following commands:

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create a virtual environment (if you haven't already)
python -m venv venv

# 3. Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# 4. Install python dependencies
pip install -r requirements.txt

# 5. Environment Variables
# Copy the example environment file and update it if necessary
cp .env.example .env

# 6. Apply Django migrations (for internal auth/admin tables in SQLite)
python manage.py migrate

# 7. Start the backend server
# Note: We run on port 8001 by default to avoid conflicts with other apps
python manage.py runserver 8001
```

The backend API will now be accessible at `http://127.0.0.1:8001/api/`.

---

## 2. Frontend Setup (React/Vite)

Open a **new** terminal window (keep the backend server running in the first one) and run:

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Environment Variables
# Ensure your frontend/.env file points to the correct backend port (8001)
# It should contain: VITE_API_URL=http://127.0.0.1:8001/api

# 4. Start the Vite development server
npm run dev
```

The frontend will automatically open in your browser, typically at `http://localhost:5173` or `http://localhost:5174`.

---

## 3. Initial Usage & Testing

1. **Sign Up**: Navigate to the frontend URL in your browser. Click **Sign Up** to register your company and create the first **Admin** account.
2. **Login**: Use the credentials you just created to sign in.
3. **Add Employees**: Go to the Employees tab and create a new employee. The system will automatically generate a secure password and log it to the backend terminal (since it simulates sending an email).
4. **Test Workflows**: Try the Check-In/Check-Out buttons in the navbar, request Time Off, and view the automated Payroll calculations in the employee details tab.

## Troubleshooting
- **Port 8000 in use**: If Django fails to start because port 8000 is occupied, always use `python manage.py runserver 8001` and ensure `VITE_API_URL` in `frontend/.env` matches.
- **MongoDB connection refused**: Ensure your local MongoDB service is actively running, or that your `.env` contains a valid `MONGO_URI` for MongoDB Atlas.
