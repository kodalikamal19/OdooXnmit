import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LayoutDashboard, Users, Clock3, CalendarDays, WalletCards, BarChart3, Settings, LogOut, Menu, X, UserRound, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const adminLinks = [['/dashboard', 'Dashboard', LayoutDashboard], ['/employees', 'Employees', Users], ['/attendance', 'Attendance', Clock3], ['/leave-requests', 'Leave Requests', CalendarDays], ['/payroll', 'Payroll', WalletCards], ['/reports', 'Reports', BarChart3], ['/notifications', 'Notifications', Bell], ['/settings', 'Settings', Settings]];
const employeeLinks = [['/dashboard', 'Dashboard', LayoutDashboard], ['/my-profile', 'My Profile', UserRound], ['/attendance', 'Attendance', Clock3], ['/leave', 'Leave', CalendarDays], ['/payroll', 'Payroll', WalletCards], ['/documents', 'Documents', FileText], ['/notifications', 'Notifications', Bell], ['/settings', 'Settings', Settings]];

export const DashboardLayout = ({ children }) => {
  const { user, employee, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const links = isAdmin ? adminLinks : employeeLinks;
  const name = isAdmin ? 'Avery Morgan' : employee?.name || 'Jordan Lee';
  const signOut = () => { logout(); navigate('/signin'); };
  return <div className="app-shell"><aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
    <div className="brand"><span className="brand-mark">D</span><span>dayflow</span><button className="icon-button mobile-close" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
    <div className="workspace"><span className="workspace-dot" /> Dayflow Workspace <ChevronDown size={14} /></div>
    <nav className="side-nav">{links.map(([to, label, Icon]) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span>{label === 'Notifications' && <b className="nav-count">3</b>}</NavLink>)}</nav>
    <div className="sidebar-bottom"><button className="nav-item logout-button" onClick={signOut}><LogOut size={18} /><span>Log out</span></button><div className="sidebar-help"><span className="help-dot">?</span><div><strong>Need a hand?</strong><small>Visit Help Center</small></div></div></div>
  </aside><div className="main-area"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={21} /></button><div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{isAdmin ? 'Admin overview' : 'My dashboard'}</strong></div><div className="topbar-actions"><button className="icon-button notification-button"><Bell size={19} /><i /></button><div className="profile-menu"><span className="avatar">{name.split(' ').map((part) => part[0]).join('')}</span><div className="profile-copy"><strong>{name}</strong><small>{isAdmin ? 'HR Administrator' : employee?.job_position || 'Team member'}</small></div><ChevronDown size={15} /></div></div></header><main className="page-content">{children}</main></div></div>;
};
