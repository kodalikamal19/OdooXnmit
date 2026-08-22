import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [employee, setEmployee] = useState(() => JSON.parse(localStorage.getItem('employee') || 'null'));
  const [company] = useState({ name: 'Dayflow', code: 'DF' });
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const signIn = async (loginId, password) => {
    if (password !== 'dayflow123') throw new Error('Use the demo password: dayflow123');
    const normalizedId = loginId.toLowerCase();
    const isAdmin = normalizedId === 'admin@dayflow.com';
    if (!isAdmin && normalizedId !== 'employee@dayflow.com') throw new Error('Use one of the demo accounts.');
    const nextUser = { id: isAdmin ? 1 : 2, role: isAdmin ? 'ADMIN' : 'EMPLOYEE', email: loginId };
    const nextEmployee = isAdmin ? null : { id: 2, name: 'Jordan Lee', first_name: 'Jordan', last_name: 'Lee', job_position: 'Product Designer', department_name: 'Design' };
    setUser(nextUser); setEmployee(nextEmployee);
    localStorage.setItem('user', JSON.stringify(nextUser));
    localStorage.setItem('employee', JSON.stringify(nextEmployee));
    return nextUser;
  };

  const signUp = async (formData) => {
    const read = (key) => typeof formData.get === 'function' ? formData.get(key) : formData[key];
    const nextUser = { id: 3, role: read('role') === 'HR/Admin' ? 'ADMIN' : 'EMPLOYEE', email: read('email') };
    const fullName = read('fullName') || read('name') || 'New team member';
    const nextEmployee = { id: 3, name: fullName, first_name: fullName.split(' ')[0], last_name: fullName.split(' ').slice(1).join(' '), job_position: 'New team member', department_name: 'People' };
    setUser(nextUser); setEmployee(nextEmployee);
    localStorage.setItem('user', JSON.stringify(nextUser));
    localStorage.setItem('employee', JSON.stringify(nextEmployee));
    return nextUser;
  };

  const logout = () => {
    localStorage.removeItem('user'); localStorage.removeItem('employee');
    setUser(null); setEmployee(null); setIsCheckedIn(false);
  };

  const toggleCheckIn = async () => setIsCheckedIn((value) => !value);

  return <AuthContext.Provider value={{ user, employee, company, loading: false, isCheckedIn, signIn, signUp, logout, toggleCheckIn }}>
    {children}
  </AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
