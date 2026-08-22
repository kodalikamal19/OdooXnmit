import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { Employee } from '../../types';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function StatusIndicator({ status }: { status: Employee['attendance_status'] }) {
  if (status === 'present') {
    return (
      <div title="Present" style={{
        width: 12, height: 12, borderRadius: '50%',
        background: 'var(--success)',
        boxShadow: '0 0 0 3px rgba(16,185,129,0.25)',
      }} />
    );
  }
  if (status === 'on_leave') {
    return <span title="On Leave" style={{ fontSize: 14 }}>✈️</span>;
  }
  return (
    <div title="Absent" style={{
      width: 12, height: 12, borderRadius: '50%',
      background: 'var(--warning)',
      boxShadow: '0 0 0 3px rgba(245,158,11,0.2)',
    }} />
  );
}

function EmployeeCard({ emp, onClick }: { emp: Employee; onClick: () => void }) {
  const imgSrc = emp.profile_image
    ? (emp.profile_image.startsWith('http') ? emp.profile_image : `${API_BASE}${emp.profile_image}`)
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--white)', border: '1px solid var(--gray-200)',
        borderRadius: 'var(--radius-xl)', padding: 24,
        cursor: 'pointer', transition: 'all 0.2s ease',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.boxShadow = 'var(--shadow-md)';
        el.style.borderColor = 'var(--primary-border)';
        el.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.boxShadow = '';
        el.style.borderColor = 'var(--gray-200)';
        el.style.transform = '';
      }}
    >
      {/* Status indicator top-right */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        display: 'flex', alignItems: 'center',
      }}>
        <StatusIndicator status={emp.attendance_status} />
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {imgSrc ? (
          <img src={imgSrc} alt={emp.full_name}
            style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover',
              border: '3px solid var(--gray-100)' }} />
        ) : (
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary-light), var(--primary-border))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: 'var(--primary)',
            border: '3px solid var(--gray-100)',
          }}>
            {getInitials(emp.full_name)}
          </div>
        )}

        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--gray-900)', marginBottom: 4 }}
            className="truncate">
            {emp.full_name}
          </div>
          {emp.job_position && (
            <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500, marginBottom: 2 }}>
              {emp.job_position}
            </div>
          )}
          {emp.department && (
            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{emp.department}</div>
          )}
        </div>

        {/* Quick info pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
          {emp.employee_code && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 99,
              background: 'var(--gray-100)', color: 'var(--gray-600)', fontWeight: 500,
            }}>
              {emp.employee_code}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EmployeeList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const res = await employeeApi.list(q);
      setEmployees(res.data);
    } catch {
      toast.error('Failed to load employees.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    const debounce = setTimeout(() => fetchEmployees(e.target.value), 400);
    return () => clearTimeout(debounce);
  };

  const isHR = user?.role === 'admin' || user?.role === 'hr_officer';

  return (
    <div className="page-container">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Employees</h1>
            <p className="page-subtitle">{employees.length} team members</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Search */}
            <div className="search-wrapper" style={{ width: 280 }}>
              <span className="search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </span>
              <input id="employee-search" type="text" className="search-input"
                placeholder="Search employees..." value={search} onChange={handleSearch} />
            </div>

            {/* New Employee button (HR/Admin only) */}
            {isHR && (
              <button
                id="new-employee-btn"
                className="btn btn-primary"
                onClick={() => navigate('/employees/new')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                New Employee
              </button>
            )}
          </div>
        </div>

        {/* Status legend */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { icon: <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--success)' }} />, label: 'Present' },
            { icon: <span style={{ fontSize: 12 }}>✈️</span>, label: 'On Leave' },
            { icon: <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--warning)' }} />, label: 'Absent' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {s.icon}
              <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="loading-overlay">
            <div className="loading-spinner" style={{ width: 36, height: 36 }} />
            <span>Loading employees...</span>
          </div>
        ) : employees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>{search ? 'No employees found' : 'No employees yet'}</h3>
            <p>{search ? `No results for "${search}"` : 'Create your first employee to get started.'}</p>
            {isHR && !search && (
              <button className="btn btn-primary" style={{ marginTop: 20 }}
                onClick={() => navigate('/employees/new')}>
                Add First Employee
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
            paddingBottom: 40,
          }}>
            {employees.map(emp => (
              <EmployeeCard
                key={emp.id}
                emp={emp}
                onClick={() => navigate(`/employees/${emp.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
