import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { attendanceApi } from '../../api';
import toast from 'react-hot-toast';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [company, setCompany] = useState<{ name: string; logo: string | null } | null>(null);

  useEffect(() => {
    // Fetch today's attendance status
    attendanceApi.todayStatus().then(res => {
      setCheckedIn(res.data.checked_in && !res.data.checked_out);
    }).catch(() => {});

    // Fetch company info
    import('../../api').then(({ companyApi }) => {
      companyApi.get().then(res => setCompany(res.data)).catch(() => {});
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCheckInOut = async () => {
    setCheckingIn(true);
    try {
      if (checkedIn) {
        await attendanceApi.checkOut();
        setCheckedIn(false);
        toast.success('Checked out successfully!');
      } else {
        await attendanceApi.checkIn();
        setCheckedIn(true);
        toast.success('Checked in successfully!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update attendance.');
    } finally {
      setCheckingIn(false);
    }
  };

  const navLinks = [
    { to: '/employees', label: 'Employees' },
    { to: '/attendance', label: 'Attendance' },
    { to: '/time-off', label: 'Time Off' },
  ];

  const employeeName = user?.employee?.full_name || user?.email || 'User';
  const profileImage = user?.employee?.profile_image;

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 'var(--navbar-height)',
      background: 'var(--white)',
      borderBottom: '1px solid var(--gray-200)',
      boxShadow: 'var(--shadow-sm)',
      zIndex: 100,
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 1400, margin: '0 auto',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 32,
      }}>
        {/* Logo */}
        <Link to="/employees" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {company?.logo ? (
            <img src={company.logo} alt="Logo" style={{ height: 32, width: 'auto', borderRadius: 6 }} />
          ) : (
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px',
            }}>
              HR
            </div>
          )}
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--gray-900)' }}>
            {company?.name || 'OdooXnmit'}
          </span>
        </Link>

        {/* Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          {navLinks.map(link => {
            const active = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14, fontWeight: 500,
                  color: active ? 'var(--primary)' : 'var(--gray-600)',
                  background: active ? 'var(--primary-light)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!active) (e.target as HTMLElement).style.background = 'var(--gray-100)';
                }}
                onMouseLeave={e => {
                  if (!active) (e.target as HTMLElement).style.background = 'transparent';
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Check-In/Out Systray */}
          {user?.employee_id && (
            <button
              onClick={handleCheckInOut}
              disabled={checkingIn}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 14px',
                background: checkedIn ? 'var(--success-light)' : 'var(--danger-light)',
                border: `1.5px solid ${checkedIn ? 'var(--success-border)' : 'var(--danger-border)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                color: checkedIn ? '#065F46' : '#991B1B',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: checkedIn ? 'var(--success)' : 'var(--danger)',
                boxShadow: checkedIn ? '0 0 0 3px rgba(16,185,129,0.25)' : '0 0 0 3px rgba(239,68,68,0.25)',
              }} />
              {checkingIn ? '...' : checkedIn ? 'Check Out' : 'Check In'}
            </button>
          )}

          {/* Profile */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setProfileOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 10px 5px 5px',
                background: profileOpen ? 'var(--gray-100)' : 'transparent',
                border: '1.5px solid var(--gray-200)',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {profileImage ? (
                <img src={profileImage} alt="" className="avatar" style={{ width: 30, height: 30 }} />
              ) : (
                <div className="avatar-placeholder" style={{ width: 30, height: 30, fontSize: 12 }}>
                  {getInitials(employeeName)}
                </div>
              )}
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-700)', maxWidth: 120 }} className="truncate">
                {employeeName.split(' ')[0]}
              </span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4L6 8L10 4" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {profileOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                background: 'var(--white)', border: '1px solid var(--gray-200)',
                borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                minWidth: 200, padding: '8px',
                animation: 'slideUp 0.15s ease',
                zIndex: 200,
              }}>
                <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid var(--gray-100)', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-900)' }}>{employeeName}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{user?.role?.replace('_', ' ')}</div>
                </div>
                <button
                  onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '8px 12px', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 14, color: 'var(--gray-700)', borderRadius: 6,
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  👤 My Profile
                </button>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '8px 12px', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 14, color: 'var(--danger)', borderRadius: 6,
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-light)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
