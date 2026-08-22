import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const PW_REQUIREMENTS = [
  { key: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'digit', label: 'One number', test: (p: string) => /\d/.test(p) },
  { key: 'special', label: 'One special character (@#$%!&*)', test: (p: string) => /[@#$%!&*]/.test(p) },
];

export default function SignUp() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company_name: '',
    password: '', confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | string[]>>({});

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required.';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email is required.';
    if (!form.phone.trim() || !/^\+?[\d\s\-]{7,15}$/.test(form.phone)) e.phone = 'Valid phone number is required.';
    if (!form.company_name.trim()) e.company_name = 'Company name is required.';
    const pwErrs = PW_REQUIREMENTS.filter(r => !r.test(form.password)).map(r => r.label);
    if (pwErrs.length) e.password = pwErrs.join(' | ');
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await authApi.signup({
        name: form.name,
        email: form.email,
        phone: form.phone,
        company_name: form.company_name,
        password: form.password,
        confirm_password: form.confirm_password,
      } as any);
      toast.success('Account created! Signing you in...');
      await login(form.email, form.password);
      navigate('/employees');
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors) setErrors(data.errors);
      else toast.error(data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const pwStrength = PW_REQUIREMENTS.filter(r => r.test(form.password)).length;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #EEF2FF 0%, #F9FAFB 50%, #F0FDF4 100%)',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Logo */}
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
            OdooXnmit HR
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>Create your company account</p>
        </div>

        <div style={{
          background: 'var(--white)', borderRadius: 20,
          boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
          padding: '32px', border: '1px solid var(--gray-200)',
        }}>
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {/* Name */}
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Full Name <span className="required">*</span></label>
                <input id="signup-name" type="text" className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)} />
                {errors.name && <span className="form-error">{errors.name as string}</span>}
              </div>

              {/* Company Name */}
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Company Name <span className="required">*</span></label>
                <input id="signup-company" type="text" className={`form-input ${errors.company_name ? 'error' : ''}`}
                  placeholder="Acme Corporation" value={form.company_name} onChange={e => set('company_name', e.target.value)} />
                {errors.company_name && <span className="form-error">{errors.company_name as string}</span>}
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email <span className="required">*</span></label>
                <input id="signup-email" type="email" className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="john@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
                {errors.email && <span className="form-error">{errors.email as string}</span>}
              </div>

              {/* Phone */}
              <div className="form-group">
                <label className="form-label">Phone <span className="required">*</span></label>
                <input id="signup-phone" type="tel" className={`form-input ${errors.phone ? 'error' : ''}`}
                  placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
                {errors.phone && <span className="form-error">{errors.phone as string}</span>}
              </div>

              {/* Password */}
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Password <span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input id="signup-password" type={showPassword ? 'text' : 'password'}
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    placeholder="Create a strong password"
                    value={form.password} onChange={e => set('password', e.target.value)}
                    style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 16 }}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {/* Password strength */}
                {form.password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{
                          flex: 1, height: 3, borderRadius: 2,
                          background: i <= pwStrength
                            ? pwStrength <= 2 ? 'var(--danger)' : pwStrength <= 3 ? 'var(--warning)' : 'var(--success)'
                            : 'var(--gray-200)',
                          transition: 'background 0.2s ease',
                        }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {PW_REQUIREMENTS.map(r => (
                        <span key={r.key} style={{
                          fontSize: 11, padding: '2px 7px', borderRadius: 4,
                          background: r.test(form.password) ? 'var(--success-light)' : 'var(--gray-100)',
                          color: r.test(form.password) ? '#065F46' : 'var(--gray-500)',
                        }}>
                          {r.test(form.password) ? '✓ ' : '○ '}{r.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {errors.password && <span className="form-error">{errors.password as string}</span>}
              </div>

              {/* Confirm Password */}
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Confirm Password <span className="required">*</span></label>
                <input id="signup-confirm-password" type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.confirm_password ? 'error' : ''}`}
                  placeholder="Repeat your password"
                  value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} />
                {errors.confirm_password && <span className="form-error">{errors.confirm_password as string}</span>}
              </div>
            </div>

            <button id="signup-submit" type="submit" className="btn btn-primary btn-full btn-lg"
              disabled={loading} style={{ marginTop: 8 }}>
              {loading ? (
                <><div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Creating account...</>
              ) : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--gray-500)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
