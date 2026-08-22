import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const PW_REQUIREMENTS = [
  { key: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'digit', label: 'One number', test: (p: string) => /\d/.test(p) },
  { key: 'special', label: 'Special character (@#$%!&*)', test: (p: string) => /[@#$%!&*]/.test(p) },
];

export default function ChangePassword() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | string[]>>({});
  const [showNew, setShowNew] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.current_password) errs.current_password = 'Current password is required.';
    const pwErrs = PW_REQUIREMENTS.filter(r => !r.test(form.new_password)).map(r => r.label);
    if (pwErrs.length) errs.new_password = pwErrs.join(' | ');
    if (form.new_password !== form.confirm_password) errs.confirm_password = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await authApi.changePassword(form);
      toast.success('Password changed successfully! Please log in again.');
      logout();
      navigate('/login');
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors) setErrors(data.errors);
      else toast.error(data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = PW_REQUIREMENTS.filter(r => r.test(form.new_password)).length;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #EEF2FF 0%, #F9FAFB 100%)', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            boxShadow: '0 8px 25px rgba(79,70,229,0.35)', marginBottom: 14,
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 20 }}>HR</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>
            Change Password
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>
            Please set a new password before continuing
          </p>
        </div>

        <div style={{
          background: 'var(--white)', borderRadius: 20, padding: 32,
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)', border: '1px solid var(--gray-200)',
        }}>
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Current Password <span className="required">*</span></label>
              <input type="password" className={`form-input ${errors.current_password ? 'error' : ''}`}
                placeholder="Your current password"
                value={form.current_password} onChange={e => set('current_password', e.target.value)} />
              {errors.current_password && <span className="form-error">{errors.current_password as string}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">New Password <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <input type={showNew ? 'text' : 'password'}
                  className={`form-input ${errors.new_password ? 'error' : ''}`}
                  placeholder="Create a strong password"
                  value={form.new_password} onChange={e => set('new_password', e.target.value)}
                  style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                  {showNew ? '🙈' : '👁️'}
                </button>
              </div>
              {form.new_password && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= pwStrength
                        ? pwStrength <= 2 ? 'var(--danger)' : pwStrength <= 3 ? 'var(--warning)' : 'var(--success)'
                        : 'var(--gray-200)',
                    }} />
                  ))}
                </div>
              )}
              {errors.new_password && <span className="form-error">{errors.new_password as string}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password <span className="required">*</span></label>
              <input type="password" className={`form-input ${errors.confirm_password ? 'error' : ''}`}
                placeholder="Repeat new password"
                value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} />
              {errors.confirm_password && <span className="form-error">{errors.confirm_password as string}</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg"
              disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
