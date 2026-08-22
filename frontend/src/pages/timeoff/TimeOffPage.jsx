import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, 
  Upload, Plus, Search, FileText, ChevronLeft, ChevronRight, AlertCircle 
} from 'lucide-react';

export const TimeOffPage = () => {
  const { user, employee } = useAuth();
  const isAdminOrHR = user?.role in ['ADMIN', 'HR_OFFICER'] || user?.role === 'ADMIN' || user?.role === 'HR_OFFICER';

  // Admin Tab State: 'requests' | 'allocations'
  const [adminTab, setAdminTab] = useState('requests');

  const [requests, setRequests] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState('PAID');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, allocRes, holRes] = await Promise.all([
        api.get('/timeoff/requests/', { params: { search: search.trim() } }),
        api.get('/timeoff/allocations/'),
        api.get('/timeoff/holidays/')
      ]);
      setRequests(reqRes.data.results || reqRes.data);
      setAllocations(allocRes.data.results || allocRes.data);
      setHolidays(holRes.data.results || holRes.data);
    } catch (err) {
      console.error('Error fetching time off data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const handleApprove = async (id) => {
    try {
      await api.post(`/timeoff/requests/${id}/approve/`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id) => {
    try {
      await api.post(`/timeoff/requests/${id}/reject/`);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setModalError('');

    if (requestType === 'SICK' && !attachment) {
      setModalError('Medical certification document attachment is required for Sick Leave.');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('time_off_type', requestType);
      data.append('start_date', startDate);
      data.append('end_date', endDate);
      data.append('reason', reason);
      if (attachment) {
        data.append('attachment', attachment);
      }

      await api.post('/timeoff/requests/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowRequestModal(false);
      setReason('');
      setAttachment(null);
      fetchData();
    } catch (err) {
      console.error(err);
      setModalError(err.response?.data?.error || err.response?.data?.attachment || 'Failed to submit time off request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calendar Days Computation
  const yr = currentMonthDate.getFullYear();
  const mo = currentMonthDate.getMonth();
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const firstDayIndex = new Date(yr, mo, 1).getDay();

  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(new Date(yr, mo, d));
  }

  // Derived Allocations
  const paidAlloc = allocations.find(a => a.time_off_type === 'PAID');
  const sickAlloc = allocations.find(a => a.time_off_type === 'SICK');

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Time Off & Leave Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdminOrHR ? 'Review leave allocations and employee time off requests' : 'Request time off and view leave calendar'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isAdminOrHR && (
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setAdminTab('requests')}
                className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                  adminTab === 'requests' ? 'bg-white text-purple-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Time Off Requests
              </button>
              <button
                onClick={() => setAdminTab('allocations')}
                className={`px-4 py-1.5 rounded-lg font-bold transition-all ${
                  adminTab === 'allocations' ? 'bg-white text-purple-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Allocations
              </button>
            </div>
          )}

          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-gradient hover:opacity-95 text-white rounded-xl font-bold text-xs shadow-md shadow-purple-900/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Request Time Off</span>
          </button>
        </div>
      </div>

      {/* Allocations Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-purple-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-purple-800 font-bold text-xs uppercase tracking-wider">Paid Time Off</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {paidAlloc ? `${paidAlloc.remaining_days} days` : '24 days'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Available for rest and vacations</p>
          </div>
          <div className="p-3 bg-purple-100 rounded-xl text-purple-700">
            <CalendarIcon className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-emerald-800 font-bold text-xs uppercase tracking-wider">Sick Time Off</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {sickAlloc ? `${sickAlloc.remaining_days} days` : '7 days'}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Requires medical certificate attachment</p>
          </div>
          <div className="p-3 bg-emerald-100 rounded-xl text-emerald-700">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-slate-600 font-bold text-xs uppercase tracking-wider">Unpaid Leave</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">Available</p>
            <p className="text-[10px] text-rose-600 font-medium mt-0.5">Deducts payable days during payroll</p>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ADMIN/HR VIEW: Requests Table or Allocations View */}
      {isAdminOrHR ? (
        adminTab === 'requests' ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">All Employee Time Off Requests</h2>
              <div className="relative max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by employee or status..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-1.5 pl-9 pr-3 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/80 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Start Date</th>
                    <th className="px-6 py-4">End Date</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Attachment</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {requests.length > 0 ? (
                    requests.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-sans">
                          <p className="font-bold text-slate-800">{req.employee_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{req.employee_login_id}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-semibold">{req.start_date}</td>
                        <td className="px-6 py-4 text-slate-700 font-semibold">{req.end_date}</td>
                        <td className="px-6 py-4 font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            {req.time_off_type_display}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-sans">
                          {req.attachment_url ? (
                            <a
                              href={req.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-purple-700 underline font-bold hover:text-purple-900 flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" /> View Doc
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-sans">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                            req.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {req.status === 'APPROVED' ? 'Validated / Approved' : req.status === 'REJECTED' ? 'Refused / Rejected' : 'To Approve'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 font-sans">
                          {req.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(req.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(req.id)}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] shadow-xs"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-sans">No leave requests found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800">Employee Leave Allocations Overview</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/80 text-slate-700 uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Leave Type</th>
                    <th className="px-6 py-4">Total Allocated</th>
                    <th className="px-6 py-4">Days Used</th>
                    <th className="px-6 py-4">Remaining Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {allocations.map(al => (
                    <tr key={al.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-sans font-bold text-slate-800">{al.employee_name}</td>
                      <td className="px-6 py-4 font-sans font-semibold">{al.time_off_type}</td>
                      <td className="px-6 py-4 text-slate-700">{al.total_days} days</td>
                      <td className="px-6 py-4 text-rose-700 font-bold">{al.used_days} days</td>
                      <td className="px-6 py-4 text-emerald-700 font-bold">{al.remaining_days} days remaining</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* EMPLOYEE VIEW: Interactive Calendar Grid */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setCurrentMonthDate(new Date(yr, mo - 1, 1))}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-base font-bold text-slate-800 font-mono">
                {currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setCurrentMonthDate(new Date(yr, mo + 1, 1))}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center space-x-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 shadow-xs"></span>
                <span className="text-slate-700">Validated / Approved</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300"></span>
                <span className="text-slate-700">To Approve / Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300"></span>
                <span className="text-slate-700">Refused / Rejected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-purple-100 border border-purple-300"></span>
                <span className="text-purple-800">Public Holiday</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="font-bold text-slate-500 py-2 uppercase tracking-wider">
                {day}
              </div>
            ))}

            {calendarCells.map((dateObj, idx) => {
              if (!dateObj) {
                return <div key={`empty-${idx}`} className="h-24 bg-slate-50 rounded-xl border border-slate-100 opacity-40" />;
              }

              const dateStr = dateObj.toISOString().split('T')[0];
              const isToday = dateStr === new Date().toISOString().split('T')[0];

              const reqs = requests.filter(r => r.start_date <= dateStr && r.end_date >= dateStr);
              const holiday = holidays.find(h => h.date === dateStr);

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    setStartDate(dateStr);
                    setEndDate(dateStr);
                    setShowRequestModal(true);
                  }}
                  className={`h-24 p-2 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer group hover:border-purple-500 ${
                    isToday ? 'bg-purple-50/60 border-purple-300 font-bold' : 'bg-slate-50/50 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`font-mono text-xs ${isToday ? 'text-purple-800 font-bold' : 'text-slate-700'}`}>
                      {dateObj.getDate()}
                    </span>
                    {holiday && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200 truncate max-w-[80px]" title={holiday.name}>
                        {holiday.name}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {reqs.map(r => (
                      <div
                        key={r.id}
                        className={`p-1 rounded text-[10px] font-bold truncate ${
                          r.status === 'APPROVED' ? 'bg-emerald-500 text-white shadow-xs' :
                          r.status === 'REJECTED' ? 'bg-rose-100 text-rose-700 border border-rose-300 line-through' :
                          'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                        title={`${r.time_off_type_display}: ${r.status}`}
                      >
                        {r.time_off_type_display}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TIME OFF REQUEST POP-UP MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-purple-700" />
                <span>Time Off Request</span>
              </h3>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 uppercase tracking-wider mb-1 font-bold">Employee</label>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-bold">
                  {employee ? employee.name : user?.username}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 uppercase tracking-wider mb-1 font-bold">Time Off Type *</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 font-medium focus:outline-none focus:border-purple-600"
                >
                  <option value="PAID">Paid Time Off (24 days allocation)</option>
                  <option value="SICK">Sick Leave (7 days allocation - Requires Attachment)</option>
                  <option value="UNPAID">Unpaid Leave (Reduces Payable Days)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 uppercase tracking-wider mb-1 font-bold">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 uppercase tracking-wider mb-1 font-bold">End Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 uppercase tracking-wider mb-1 font-bold">Reason / Remarks</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for requesting time off..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-800 font-medium"
                />
              </div>

              {requestType === 'SICK' && (
                <div>
                  <label className="block uppercase tracking-wider mb-1 font-bold text-amber-700 flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> Sick Leave Certification Attachment *
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setAttachment(e.target.files[0])}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-slate-700 text-xs"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Upload doctor's prescription or medical certificate (PDF/Image).</p>
                </div>
              )}

              <div className="pt-3 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-purple-gradient text-white rounded-xl font-bold shadow-md shadow-purple-900/20 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
