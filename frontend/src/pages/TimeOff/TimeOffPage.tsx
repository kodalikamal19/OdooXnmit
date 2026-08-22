import { useState, useEffect } from 'react';
import { timeOffApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { TimeOffRequest, TimeOffAllocation, PublicHoliday } from '../../types';
import toast from 'react-hot-toast';

// Leave status type
type LeaveStatus = 'approved' | 'pending' | 'rejected';

// ─── Time Off Request Modal ─────────────────────────────────────────────────
function TimeOffRequestModal({
  selectedDate, onClose, onSubmit,
  allocations,
}: {
  selectedDate: string;
  onClose: () => void;
  onSubmit: () => void;
  allocations: TimeOffAllocation[];
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    leave_type: 'paid_time_off',
    start_date: selectedDate,
    end_date: selectedDate,
    reason: '',
  });
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const days = form.start_date && form.end_date
    ? Math.max(1, (new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / 86400000 + 1)
    : 1;

  const alloc = allocations.find(a => a.type === form.leave_type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.start_date) errs.start_date = 'Start date is required.';
    if (!form.end_date) errs.end_date = 'End date is required.';
    if (form.start_date > form.end_date) errs.end_date = 'End date must be after start date.';
    if (form.leave_type === 'sick_leave' && !attachment) errs.attachment = 'Certificate required for sick leave.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    const fd = new FormData();
    fd.append('leave_type', form.leave_type);
    fd.append('start_date', form.start_date);
    fd.append('end_date', form.end_date);
    fd.append('reason', form.reason);
    if (attachment) fd.append('attachment', attachment);

    try {
      await timeOffApi.createRequest(fd);
      toast.success('Time off request submitted!');
      onSubmit();
      onClose();
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors) setErrors(data.errors);
      else toast.error(data?.error || 'Failed to submit request.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Time Off Request</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Employee */}
            <div className="form-group">
              <label className="form-label">Employee</label>
              <input type="text" className="form-input"
                value={user?.employee?.full_name || user?.email || ''} disabled />
            </div>

            {/* Leave Type */}
            <div className="form-group">
              <label className="form-label">Time Off Type <span className="required">*</span></label>
              <select className="form-select" value={form.leave_type} onChange={e => set('leave_type', e.target.value)}>
                <option value="paid_time_off">Paid Time Off</option>
                <option value="sick_leave">Sick Leave</option>
                <option value="unpaid_leave">Unpaid Leave</option>
              </select>
            </div>

            {/* Validity Period */}
            <div className="form-group">
              <label className="form-label">Validity Period <span className="required">*</span></label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="date" className={`form-input ${errors.start_date ? 'error' : ''}`}
                  value={form.start_date} onChange={e => set('start_date', e.target.value)} />
                <span style={{ color: 'var(--gray-500)', fontSize: 13, flexShrink: 0 }}>to</span>
                <input type="date" className={`form-input ${errors.end_date ? 'error' : ''}`}
                  value={form.end_date} onChange={e => set('end_date', e.target.value)} />
              </div>
              {errors.start_date && <span className="form-error">{errors.start_date}</span>}
              {errors.end_date && <span className="form-error">{errors.end_date}</span>}
            </div>

            {/* Allocation */}
            <div className="form-group">
              <label className="form-label">Allocation</label>
              <div style={{
                padding: '10px 14px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                borderRadius: 'var(--radius-md)', fontSize: 14, display: 'flex', justifyContent: 'space-between',
              }}>
                <span style={{ fontWeight: 500 }}>{days} {days === 1 ? 'Day' : 'Days'}</span>
                {alloc && (
                  <span style={{ color: 'var(--gray-500)', fontSize: 13 }}>
                    {alloc.remaining_days} days available
                  </span>
                )}
              </div>
            </div>

            {/* Reason */}
            <div className="form-group">
              <label className="form-label">Reason</label>
              <textarea className="form-input" rows={2} placeholder="Optional reason..."
                value={form.reason} onChange={e => set('reason', e.target.value)}
                style={{ resize: 'vertical' }} />
            </div>

            {/* Attachment */}
            <div className="form-group">
              <label className="form-label">
                Attachment {form.leave_type === 'sick_leave' && <span className="required">*</span>}
              </label>
              <div style={{
                border: `1.5px dashed ${errors.attachment ? 'var(--danger)' : 'var(--gray-300)'}`,
                borderRadius: 'var(--radius-md)', padding: '16px',
                textAlign: 'center', cursor: 'pointer',
                background: attachment ? 'var(--success-light)' : 'var(--gray-50)',
              }}>
                <input type="file" id="attachment-input" style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => setAttachment(e.target.files?.[0] || null)} />
                <label htmlFor="attachment-input" style={{ cursor: 'pointer' }}>
                  {attachment ? (
                    <div style={{ fontSize: 13, color: '#065F46' }}>✓ {attachment.name}</div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>📎</div>
                      <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                        {form.leave_type === 'sick_leave'
                          ? 'Upload sick leave certificate (required)'
                          : 'Click to upload a document (optional)'}
                      </div>
                    </div>
                  )}
                </label>
              </div>
              {errors.attachment && <span className="form-error">{errors.attachment}</span>}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Discard</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Calendar Cell Legend ───────────────────────────────────────────────────
function getDateStatus(
  dateStr: string,
  requests: TimeOffRequest[],
  holidays: PublicHoliday[]
): { status: LeaveStatus | 'holiday' | null; label?: string } {
  const holiday = holidays.find(h => h.date === dateStr);
  if (holiday) return { status: 'holiday', label: holiday.name };

  const req = requests.find(r => dateStr >= r.start_date && dateStr <= r.end_date);
  if (!req) return { status: null };
  return { status: req.status as LeaveStatus };
}

// ─── Year Calendar ───────────────────────────────────────────────────────────
function YearCalendar({
  year, requests, holidays, onDateClick,
}: {
  year: number;
  requests: TimeOffRequest[];
  holidays: PublicHoliday[];
  onDateClick: (date: string) => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {months.map(month => {
        const monthDate = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = monthDate.getDay(); // 0=Sun
        const monthName = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

        return (
          <div key={month} style={{
            background: 'var(--white)', border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-md)', overflow: 'hidden',
          }}>
            <div style={{
              background: 'var(--gray-50)', padding: '8px 12px',
              fontSize: 12, fontWeight: 600, color: 'var(--gray-600)',
              borderBottom: '1px solid var(--gray-200)',
            }}>
              {monthName}
            </div>
            <div style={{ padding: 8 }}>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, marginBottom: 4 }}>
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} style={{ fontSize: 9, textAlign: 'center', color: 'var(--gray-400)', fontWeight: 600, padding: '2px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`blank-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const { status, label } = getDateStatus(dateStr, requests, holidays);
                  const isToday = dateStr === today;
                  const isPast = dateStr < today;

                  let bg = 'transparent';
                  let textColor = isPast ? 'var(--gray-400)' : 'var(--gray-700)';
                  let title = dateStr;

                  if (status === 'approved') { bg = 'var(--success)'; textColor = 'white'; title = `Approved leave`; }
                  else if (status === 'pending') { bg = 'var(--warning)'; textColor = 'white'; title = `Pending approval`; }
                  else if (status === 'rejected') { textColor = 'var(--danger)'; title = `Rejected`; }
                  else if (status === 'holiday') { bg = 'var(--primary-light)'; textColor = 'var(--primary)'; title = label || 'Holiday'; }

                  return (
                    <div
                      key={day}
                      onClick={() => !isPast && onDateClick(dateStr)}
                      title={title}
                      style={{
                        fontSize: 10, textAlign: 'center', padding: '3px 1px',
                        borderRadius: 3, cursor: !isPast ? 'pointer' : 'default',
                        background: bg, color: textColor,
                        border: isToday ? '1.5px solid var(--primary)' : 'none',
                        fontWeight: isToday ? 700 : 400,
                        transition: 'all 0.1s ease',
                        position: 'relative',
                        ...(status === 'rejected' ? { textDecoration: 'line-through' } : {}),
                      }}
                      onMouseEnter={e => {
                        if (!isPast && !status) (e.currentTarget as HTMLElement).style.background = 'var(--gray-100)';
                      }}
                      onMouseLeave={e => {
                        if (!status) (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Employee Time Off View ─────────────────────────────────────────────────
function EmployeeTimeOffView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [allocations, setAllocations] = useState<TimeOffAllocation[]>([]);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [calRes, allocRes] = await Promise.all([
        timeOffApi.calendar(year),
        timeOffApi.allocations(),
      ]);
      setRequests(calRes.data.requests);
      setHolidays(calRes.data.public_holidays);
      setAllocations(allocRes.data);
    } catch { toast.error('Failed to load time off data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [year]);

  return (
    <div>
      {/* Allocation Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {allocations.map(alloc => (
          <div key={alloc.id} style={{
            background: 'var(--white)', border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius-lg)', padding: '16px 20px', minWidth: 180,
          }}>
            <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>
              {alloc.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-900)' }}>
              {alloc.remaining_days}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
              days available · {alloc.used_days} used of {alloc.total_days}
            </div>
            <div style={{
              marginTop: 8, height: 4, background: 'var(--gray-100)', borderRadius: 2,
            }}>
              <div style={{
                width: `${Math.min(100, (alloc.used_days / alloc.total_days) * 100)}%`,
                height: '100%', background: 'var(--primary)', borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* New button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setYear(y => y - 1)}>←</button>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{year}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setYear(y => y + 1)}>→</button>
        </div>
        <button className="btn btn-primary" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
          + New Request
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { color: 'var(--success)', label: 'Validated/Approved', style: {} },
          { color: 'var(--warning)', label: 'Pending Approval', style: {} },
          { color: 'var(--danger)', label: 'Rejected', style: { textDecoration: 'line-through' } },
          { color: 'var(--primary)', label: 'Public Holiday', style: {} },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 14, height: 14, borderRadius: 3,
              background: l.color, ...l.style,
            }} />
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" /></div>
      ) : (
        <YearCalendar
          year={year}
          requests={requests}
          holidays={holidays}
          onDateClick={setSelectedDate}
        />
      )}

      {/* Modal */}
      {selectedDate && (
        <TimeOffRequestModal
          selectedDate={selectedDate}
          allocations={allocations}
          onClose={() => setSelectedDate(null)}
          onSubmit={fetchData}
        />
      )}
    </div>
  );
}

// ─── Admin Time Off View ────────────────────────────────────────────────────
function AdminTimeOffView() {
  const [activeTab, setActiveTab] = useState<'requests' | 'allocations'>('requests');
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [allocations, setAllocations] = useState<TimeOffAllocation[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchRequests = async (q?: string) => {
    setLoading(true);
    try {
      const res = await timeOffApi.requests(q);
      setRequests(res.data);
    } catch { toast.error('Failed to load requests.'); }
    finally { setLoading(false); }
  };

  const fetchAllocations = async () => {
    try {
      const res = await timeOffApi.allocations();
      setAllocations(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchRequests();
    fetchAllocations();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    const t = setTimeout(() => fetchRequests(e.target.value), 400);
    return () => clearTimeout(t);
  };

  const handleReview = async (id: string, action: 'approve' | 'reject') => {
    try {
      await timeOffApi.reviewRequest(id, action);
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'}.`);
      fetchRequests(search);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update request.');
    }
  };

  // Aggregate allocations by type
  const allocSummary = [
    { type: 'paid_time_off', label: 'Paid Time Off', total: 24 },
    { type: 'sick_leave', label: 'Sick Time Off', total: 7 },
  ];

  return (
    <div>
      {/* Sub tabs */}
      <div className="nav-tabs" style={{ marginBottom: 20 }}>
        <button className={`nav-tab ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}>Time Off</button>
        <button className={`nav-tab ${activeTab === 'allocations' ? 'active' : ''}`}
          onClick={() => setActiveTab('allocations')}>Allocations</button>
      </div>

      {/* Allocation cards */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
        {allocSummary.map(a => (
          <div key={a.type} style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>{a.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 2 }}>
              {a.total} Days Available
            </div>
            <div style={{ height: 4, background: 'var(--primary-light)', borderRadius: 2 }}>
              <div style={{ width: '100%', height: '100%', background: 'var(--primary)', borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>

      {activeTab === 'requests' && (
        <>
          {/* Controls */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <button className="btn btn-primary btn-sm">NEW</button>
            <div className="search-wrapper" style={{ flex: 1, maxWidth: 320 }}>
              <span className="search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </span>
              <input type="text" className="search-input" placeholder="Search by employee..."
                value={search} onChange={handleSearch} />
            </div>
          </div>

          {loading ? (
            <div className="loading-overlay"><div className="loading-spinner" /></div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Time Off Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                        No time off requests found.
                      </td>
                    </tr>
                  ) : (
                    requests.map(req => (
                      <tr key={req.id}>
                        <td style={{ fontWeight: 500 }}>{req.employee_name || '—'}</td>
                        <td>{req.start_date}</td>
                        <td>{req.end_date}</td>
                        <td>
                          <span className="badge badge-info">{req.leave_type_label}</span>
                        </td>
                        <td>
                          <span className={`badge ${
                            req.status === 'approved' ? 'badge-success' :
                            req.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {req.status === 'approved' ? 'Approved' :
                             req.status === 'rejected' ? 'Rejected' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          {req.status === 'pending' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleReview(req.id, 'approve')}
                                title="Approve"
                              >
                                ✓
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleReview(req.id, 'reject')}
                                title="Reject"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                          {req.status !== 'pending' && (
                            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>Reviewed</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'allocations' && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Total Days</th>
                <th>Used Days</th>
                <th>Remaining</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {allocations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                    No allocations found.
                  </td>
                </tr>
              ) : (
                allocations.map(alloc => (
                  <tr key={alloc.id}>
                    <td>{alloc.employee_id}</td>
                    <td><span className="badge badge-info">{alloc.label}</span></td>
                    <td>{alloc.total_days}</td>
                    <td>{alloc.used_days}</td>
                    <td style={{ fontWeight: 600, color: alloc.remaining_days > 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {alloc.remaining_days}
                    </td>
                    <td>{alloc.year}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Time Off Page ─────────────────────────────────────────────────────
export default function TimeOffPage() {
  const { user } = useAuth();
  const isHR = user?.role === 'admin' || user?.role === 'hr_officer';

  return (
    <div className="page-container">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Time Off</h1>
            <p className="page-subtitle">
              {isHR ? 'Manage employee time off requests and allocations' : 'View and request time off'}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {isHR ? <AdminTimeOffView /> : <EmployeeTimeOffView />}
          </div>
        </div>
      </div>
    </div>
  );
}
