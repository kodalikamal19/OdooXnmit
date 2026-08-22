import { useState, useEffect } from 'react';
import { attendanceApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { AttendanceRecord } from '../../types';
import toast from 'react-hot-toast';
import { addMonths, subMonths } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

function formatTime(isoStr: string | null) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch { return isoStr; }
}

// ─── Employee View ─────────────────────────────────────────────────────────
function EmployeeAttendanceView() {
  const now = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [data, setData] = useState<{
    year: number; month: number;
    present_count: number; leave_count: number; total_working_days: number;
    records: AttendanceRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async (date: Date) => {
    setLoading(true);
    try {
      const res = await attendanceApi.myAttendance(date.getFullYear(), date.getMonth() + 1);
      setData(res.data);
    } catch { toast.error('Failed to load attendance.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(currentDate); }, [currentDate]);

  const prevMonth = () => setCurrentDate(d => subMonths(d, 1));
  const nextMonth = () => setCurrentDate(d => addMonths(d, 1));

  return (
    <div>
      {/* Month Navigation + Stats */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap',
      }}>
        <button className="btn btn-secondary btn-sm" onClick={prevMonth}>←</button>
        <div style={{
          padding: '6px 16px', background: 'var(--white)', border: '1px solid var(--gray-200)',
          borderRadius: 8, fontWeight: 600, fontSize: 14, minWidth: 130, textAlign: 'center',
        }}>
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={nextMonth}>→</button>

        {data && (
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <div className="stat-chip">
              <div className="stat-chip-label">Present</div>
              <div className="stat-chip-value" style={{ color: 'var(--success)' }}>{data.present_count}</div>
            </div>
            <div className="stat-chip">
              <div className="stat-chip-label">Leaves</div>
              <div className="stat-chip-value" style={{ color: 'var(--warning)' }}>{data.leave_count}</div>
            </div>
            <div className="stat-chip">
              <div className="stat-chip-label">Working Days</div>
              <div className="stat-chip-value">{data.total_working_days}</div>
            </div>
          </div>
        )}
      </div>

      {data && (
        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16, fontWeight: 500 }}>
          {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Work Hours</th>
                <th>Extra Hours</th>
              </tr>
            </thead>
            <tbody>
              {data?.records.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                    No attendance records for this month.
                  </td>
                </tr>
              ) : (
                data?.records.map((rec, idx) => (
                  <tr key={rec.id || idx}>
                    <td style={{ fontWeight: 500 }}>{rec.date}</td>
                    <td>
                      {rec.check_in ? (
                        <span style={{ color: 'var(--success)', fontWeight: 500 }}>{formatTime(rec.check_in)}</span>
                      ) : '—'}
                    </td>
                    <td>
                      {rec.check_out ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 500 }}>{formatTime(rec.check_out)}</span>
                      ) : rec.check_in ? (
                        <span style={{ color: 'var(--warning)', fontSize: 12 }}>Still in</span>
                      ) : '—'}
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: 'var(--primary)' }}>{rec.work_hours}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: rec.extra_hours !== '00:00' ? 'var(--success)' : 'var(--gray-400)' }}>
                        {rec.extra_hours}
                      </span>
                    </td>
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

// ─── Admin/HR View ─────────────────────────────────────────────────────────
function AdminAttendanceView() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async (date: string, q?: string) => {
    setLoading(true);
    try {
      const res = await attendanceApi.adminAttendance(date, q);
      setRecords(res.data.records);
    } catch { toast.error('Failed to load attendance.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(selectedDate); }, [selectedDate]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    const t = setTimeout(() => fetchData(selectedDate, e.target.value), 400);
    return () => clearTimeout(t);
  };

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const dayName = new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long' });
  const displayDate = new Date(selectedDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="search-wrapper" style={{ width: 240 }}>
          <span className="search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input type="text" className="search-input" placeholder="Search employees..."
            value={search} onChange={handleSearch} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button className="btn btn-secondary btn-sm" onClick={prevDay}>←</button>
          <select className="form-select"
            value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ width: 'auto', fontSize: 13 }}>
            <option value={selectedDate}>{selectedDate}</option>
          </select>
          <input type="date" className="form-input"
            value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ maxWidth: 160, fontSize: 13 }} />
          <button className="btn btn-secondary btn-sm" onClick={nextDay}>→</button>
        </div>
      </div>

      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 16 }}>
        {displayDate} · {dayName}
        <span style={{ marginLeft: 12, fontSize: 12, fontWeight: 400, color: 'var(--gray-500)' }}>
          {records.filter(r => r.check_in).length} present / {records.length} total
        </span>
      </p>

      {/* Table */}
      {loading ? (
        <div className="loading-overlay"><div className="loading-spinner" /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Work Hours</th>
                <th>Extra Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                    No attendance data for this date.
                  </td>
                </tr>
              ) : (
                records.map((rec, idx) => (
                  <tr key={rec.employee_id + idx}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {rec.employee_image ? (
                          <img src={rec.employee_image.startsWith('http') ? rec.employee_image : `${API_BASE}${rec.employee_image}`}
                            alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--primary-light)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: 'var(--primary)',
                          }}>
                            {(rec.employee_name || '?').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{rec.employee_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{rec.department}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {rec.check_in ? (
                        <span style={{ color: 'var(--success)', fontWeight: 500 }}>{formatTime(rec.check_in)}</span>
                      ) : '—'}
                    </td>
                    <td>
                      {rec.check_out ? (
                        <span style={{ color: 'var(--danger)', fontWeight: 500 }}>{formatTime(rec.check_out)}</span>
                      ) : rec.check_in ? (
                        <span style={{ color: 'var(--warning)', fontSize: 12 }}>Still in</span>
                      ) : '—'}
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--primary)' }}>{rec.work_hours}</td>
                    <td style={{ fontWeight: 500, color: rec.extra_hours !== '00:00' ? 'var(--success)' : 'var(--gray-400)' }}>
                      {rec.extra_hours}
                    </td>
                    <td>
                      <span className={`badge ${
                        rec.check_in ? 'badge-success' :
                        rec.status === 'on_leave' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {rec.check_in ? 'Present' : rec.status === 'on_leave' ? 'On Leave' : 'Absent'}
                      </span>
                    </td>
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

// ─── Main Attendance Page ───────────────────────────────────────────────────
export default function AttendancePage() {
  const { user } = useAuth();
  const isHR = user?.role === 'admin' || user?.role === 'hr_officer';

  return (
    <div className="page-container">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Attendance</h1>
            <p className="page-subtitle">
              {isHR ? 'Monitor and manage employee attendance records' : 'Your attendance history'}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            {isHR ? <AdminAttendanceView /> : <EmployeeAttendanceView />}
          </div>
        </div>
      </div>
    </div>
  );
}
