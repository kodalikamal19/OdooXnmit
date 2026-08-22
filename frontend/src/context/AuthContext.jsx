import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [employee, setEmployee] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Check-In systray state
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState('ABSENT');
  const [todayRecord, setTodayRecord] = useState(null);

  const fetchMe = async () => {
    try {
      const res = await api.get('/auth/me/');
      setUser(res.data.user);
      setEmployee(res.data.employee);
      setCompany(res.data.company);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Fetch current check-in status
      if (res.data.employee) {
        const checkRes = await api.get('/attendance/toggle-checkin/');
        setIsCheckedIn(checkRes.data.is_checked_in);
        setCheckInStatus(checkRes.data.attendance_status);
        setTodayRecord(checkRes.data.today_record);
      }
    } catch (err) {
      console.error('Error fetching user context:', err);
      setUser(null);
      setEmployee(null);
      setCompany(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (login_id, password) => {
    const res = await api.post('/auth/signin/', { login_id, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    setEmployee(res.data.employee);
    setCompany(res.data.company);
    localStorage.setItem('user', JSON.stringify(res.data.user));

    if (res.data.employee) {
      const checkRes = await api.get('/attendance/toggle-checkin/');
      setIsCheckedIn(checkRes.data.is_checked_in);
      setCheckInStatus(checkRes.data.attendance_status);
      setTodayRecord(checkRes.data.today_record);
    }
    return res.data;
  };

  const signUp = async (formData) => {
    const res = await api.post('/auth/signup/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    setEmployee(res.data.employee);
    setCompany(res.data.company);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setEmployee(null);
    setCompany(null);
    setIsCheckedIn(false);
  };

  const toggleCheckIn = async () => {
    const res = await api.post('/attendance/toggle-checkin/');
    setIsCheckedIn(res.data.is_checked_in);
    setCheckInStatus(res.data.attendance_status);
    setTodayRecord(res.data.record);
    
    // Refresh employee status
    if (employee) {
      setEmployee(prev => prev ? { ...prev, status_indicator: res.data.attendance_status } : null);
    }
    return res.data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      employee,
      company,
      loading,
      isCheckedIn,
      checkInStatus,
      todayRecord,
      signIn,
      signUp,
      logout,
      toggleCheckIn,
      refreshMe: fetchMe
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
