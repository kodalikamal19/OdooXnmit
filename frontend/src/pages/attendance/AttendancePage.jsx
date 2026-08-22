import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { 
  ChevronLeft, ChevronRight, Search, Calendar as CalendarIcon, 
  CheckCircle, Clock, Award 
} from 'lucide-react';

export const AttendancePage = () => {
  const { user } = useAuth();
  const isAdminOrHR = user?.role in ['ADMIN', 'HR_OFFICER'] || user?.role === 'ADMIN' || user?.role === 'HR_OFFICER';

  // State for Employee View
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState(null);

  // State for Admin View
  const [selectedAdminDate, setSelectedAdminDate] = useState(new Date().toISOString().split('T')[0]);
  const [adminAttendanceData, setAdminAttendanceData] = useState(null);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);

  // Fetch Employee Attendance for current month
  const fetchMyAttendance = async () => {
    try {
      setLoading(true);
      const yr = currentDate.getFullYear();
      const mo = currentDate.getMonth() + 1;
      const res = await api.get('/attendance/my-attendance/', {
        params: { year: yr, month: mo }
      });
      setAttendanceData(res.data);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Admin Attendance for selected date
  const fetchAdminAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/admin-attendance/', {
        params: { date: selectedAdminDate, search: search.trim() }
      });
      setAdminAttendanceData(res.data);
    } catch (err) {
      console.error('Error fetching admin attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminOrHR) {
      fetchAdminAttendance();
    } else {
      fetchMyAttendance();
    }
  }, [currentDate, selectedAdminDate, search]);

  const handleMonthPrev = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleMonthNext = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleDatePrev = () => {
    const d = new Date(selectedAdminDate);
    d.setDate(d.getDate() - 1);
    setSelectedAdminDate(d.toISOString().split('T')[0]);
  };

  const handleDateNext = () => {
    const d = new Date(selectedAdminDate);
    d.setDate(d.getDate() + 1);
    setSelectedAdminDate(d.toISOString().split('T')[0]);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      
      {/* Header controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Attendance Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdminOrHR ? 'Daily attendance records across all employees' : 'Monthly working schedule and attendance logs'}
          </p>
        </div>

        {/* Date Navigation */}
        {isAdminOrHR ? (
          <div className="flex items-center space-x-3">
            <button onClick={handleDatePrev} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedAdminDate}
              onChange={(e) => setSelectedAdminDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:border-purple-600"
            />
            <button onClick={handleDateNext} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3 bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-200">
            <button onClick={handleMonthPrev} className="p-1 rounded text-slate-500 hover:text-slate-800">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-slate-800 min-w-[140px] text-center font-mono">{monthName}</span>
            <button onClick={handleMonthNext} className="p-1 rounded text-slate-500 hover:text-slate-800">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Admin Search Filter */}
      {isAdminOrHR && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee by name or ID..."
            className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 focus:outline-none focus:border-purple-600 shadow-xs"
          />
        </div>
      )}

      {/* EMPLOYEE VIEW - Monthly Overview Cards */}
      {!isAdminOrHR && attendanceData && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-slate-500 font-semibold">Days Present</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{attendanceData.present_count}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-slate-500 font-semibold">Approved Leaves</p>
              <p className="text-2xl font-bold text-sky-600 mt-1">{attendanceData.leave_count}</p>
            </div>
            <div className="p-3 bg-sky-50 rounded-xl text-sky-600">
              <CalendarIcon className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-slate-500 font-semibold">Total Working Days</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{attendanceData.total_working_days}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-purple-800 font-bold">Payable Days (Payroll)</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">{attendanceData.payable_days}</p>
            </div>
            <div className="p-3 bg-purple-200/60 rounded-xl text-purple-800">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading attendance records...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/80 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200">
                <tr>
                  {isAdminOrHR && <th className="px-6 py-4">Employee</th>}
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Check-In</th>
                  <th className="px-6 py-4">Check-Out</th>
                  <th className="px-6 py-4">Work Hours</th>
                  <th className="px-6 py-4">Extra Hours</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {isAdminOrHR ? (
                  adminAttendanceData?.records?.length > 0 ? (
                    adminAttendanceData.records.map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3 font-sans">
                          {rec.profile_picture ? (
                            <img src={rec.profile_picture} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-purple-gradient text-white font-bold flex items-center justify-center text-[10px]">
                              {rec.employee_name ? rec.employee_name[0] : 'E'}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{rec.employee_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{rec.employee_login_id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-semibold">{rec.date}</td>
                        <td className="px-6 py-4 text-emerald-700 font-bold">
                          {rec.check_in ? new Date(rec.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-6 py-4 text-rose-700 font-bold">
                          {rec.check_out ? new Date(rec.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-bold">{rec.work_hours} hrs</td>
                        <td className="px-6 py-4 text-purple-700 font-bold">{rec.extra_hours} hrs</td>
                        <td className="px-6 py-4 font-sans">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            rec.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                            rec.status === 'ON_LEAVE' ? 'bg-sky-100 text-sky-700 border border-sky-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-sans">No attendance records for this date.</td>
                    </tr>
                  )
                ) : (
                  attendanceData?.records?.length > 0 ? (
                    attendanceData.records.map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-800 font-semibold">{rec.date}</td>
                        <td className="px-6 py-4 text-emerald-700 font-bold">
                          {rec.check_in ? new Date(rec.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-6 py-4 text-rose-700 font-bold">
                          {rec.check_out ? new Date(rec.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-bold">{rec.work_hours} hrs</td>
                        <td className="px-6 py-4 text-purple-700 font-bold">{rec.extra_hours} hrs</td>
                        <td className="px-6 py-4 font-sans">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            rec.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                            rec.status === 'ON_LEAVE' ? 'bg-sky-100 text-sky-700 border border-sky-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-sans">No attendance records found for selected month.</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
