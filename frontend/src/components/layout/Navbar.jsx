import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, Calendar, Clock, LogOut, User as UserIcon, 
  ChevronDown, CheckCircle, XCircle 
} from 'lucide-react';

export const Navbar = ({ onOpenMyProfile }) => {
  const { user, employee, company, logout, isCheckedIn, checkInStatus, toggleCheckIn } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [systrayOpen, setSystrayOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  const navigate = useNavigate();
  const profileRef = useRef(null);
  const systrayRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (systrayRef.current && !systrayRef.current.contains(e.target)) {
        setSystrayOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleCheckIn = async () => {
    try {
      setToggling(true);
      await toggleCheckIn();
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-2.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Left: Company Logo & Nav Links */}
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            {company?.logo ? (
              <img src={company.logo} alt="Company Logo" className="h-8 w-auto object-contain rounded" />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-purple-gradient flex items-center justify-center text-white font-bold text-lg shadow-md shadow-purple-900/20">
                {company?.code || 'OI'}
              </div>
            )}
            <span className="font-bold text-lg tracking-tight text-slate-800 flex items-center gap-1.5">
              <span className="text-purple-700 font-serif italic text-xl">odoo</span> HRMS
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <NavLink 
              to="/employees" 
              className={({ isActive }) => 
                `flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              <Users className="w-4 h-4" />
              <span>Employees</span>
            </NavLink>

            <NavLink 
              to="/attendance" 
              className={({ isActive }) => 
                `flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              <Clock className="w-4 h-4" />
              <span>Attendance</span>
            </NavLink>

            <NavLink 
              to="/timeoff" 
              className={({ isActive }) => 
                `flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              <Calendar className="w-4 h-4" />
              <span>Time Off</span>
            </NavLink>
          </div>
        </div>

        {/* Right: Check-In/Out Systray & User Profile */}
        <div className="flex items-center space-x-4">

          {/* Check-In / Check-Out Systray */}
          <div className="relative" ref={systrayRef}>
            <button
              onClick={() => setSystrayOpen(!systrayOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all text-xs font-medium"
              title="Attendance Status Systray"
            >
              {/* Green indicator dot when Checked In, Red when Checked Out */}
              <span className={`h-3 w-3 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-pulse shadow-xs' : 'bg-rose-500'}`} />
              <span className="text-slate-700 font-semibold">
                {isCheckedIn ? 'Checked In' : 'Checked Out'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {systrayOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Attendance Systray</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {isCheckedIn ? 'PRESENT' : 'NOT CHECKED IN'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 mb-3 text-center">
                  <div className="text-slate-500 text-xs mb-1">Today's Work Status</div>
                  <div className="text-base font-bold text-slate-800 flex items-center justify-center gap-2">
                    {isCheckedIn ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        <span>Working Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-rose-600" />
                        <span>Not Checked In</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleToggleCheckIn}
                  disabled={toggling}
                  className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
                    isCheckedIn 
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20' 
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  }`}
                >
                  {toggling ? 'Updating...' : (isCheckedIn ? 'Check Out ->' : 'Check IN ->')}
                </button>
              </div>
            )}
          </div>

          {/* User Profile Section */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center space-x-2 p-1 rounded-full hover:bg-slate-100 transition-all border border-slate-200"
            >
              {employee?.profile_picture ? (
                <img src={employee.profile_picture} alt="Profile" className="h-8 w-8 rounded-full object-cover border border-purple-400" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-purple-gradient text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {user?.username?.substring(0, 2).toUpperCase() || 'US'}
                </div>
              )}
              <span className="text-xs font-semibold text-slate-700 hidden md:inline-block">
                {employee ? `${employee.first_name} ${employee.last_name}` : user?.username}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {employee ? `${employee.first_name} ${employee.last_name}` : user?.username}
                  </p>
                  <p className="text-[11px] text-purple-700 font-mono">
                    {employee?.login_id || user?.role}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenMyProfile();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-purple-50 hover:text-purple-700 flex items-center space-x-2 transition-colors font-medium"
                >
                  <UserIcon className="w-4 h-4 text-purple-600" />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center space-x-2 transition-colors border-t border-slate-100 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </nav>
  );
};
