import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { SignInPage } from './pages/auth/SignInPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { EmployeesPage } from './pages/employees/EmployeesPage';
import { AttendancePage } from './pages/attendance/AttendancePage';
import { TimeOffPage } from './pages/timeoff/TimeOffPage';
import { EmployeeDetailModal } from './components/employees/EmployeeDetailModal';

const ProtectedLayout = () => {
  const { user, employee, loading } = useAuth();
  const [showMyProfile, setShowMyProfile] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading Dayflow HRMS...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar onOpenMyProfile={() => setShowMyProfile(true)} />
      
      <main className="flex-1 pb-12">
        <Routes>
          <Route path="/" element={<Navigate to="/employees" replace />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/timeoff" element={<TimeOffPage />} />
          <Route path="*" element={<Navigate to="/employees" replace />} />
        </Routes>
      </main>

      {/* "My Profile" Modal View opened from Navbar Dropdown */}
      {employee && (
        <EmployeeDetailModal
          isOpen={showMyProfile}
          onClose={() => setShowMyProfile(false)}
          employeeId={employee.id}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
