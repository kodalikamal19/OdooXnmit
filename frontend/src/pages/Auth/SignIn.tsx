import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!identifier.trim()) e.identifier = 'Login ID or Email is required.';
    if (!password) e.password = 'Password is required.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await login(identifier.trim(), password);
      navigate('/employees');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Invalid credentials.';
      setErrors({ general: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #EEF2FF 0%, #F9FAFB 50%, #F0FDF4 100%)',
      padding: '24px',
    }}>
      {/* Background decorations */}
      <div style={{
        position: 'fixed', top: -100, right: -100, width: 400, height: 400,
        borderRadius: '50%', background: 'rgba(79,70,229,0.06)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: -80, left: -80, width: 300, height: 300,
        borderRadius: '50%', background: 'rgba(16,185,129,0.05)', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo & Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            boxShadow: '0 8px 25px rgba(79,70,229,0.35)',
            marginBottom: 16,
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 24 }}>HR</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 6 }}>
            OdooXnmit HR
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--white)', borderRadius: 20,
          boxShadow: '0 20px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
          padding: '36px 32px',
          border: '1px solid var(--gray-200)',
        }}>
          <form onSubmit={handleSubmit} noValidate>
            {errors.general && (
              <div style={{
                padding: '12px 16px', marginBottom: 20,
                background: 'var(--danger-light)', border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-md)', fontSize: 13, color: '#991B1B',
              }}>
                {errors.general}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                Login ID or Email <span className="required">*</span>
              </label>
              <input
                id="signin-identifier"
                type="text"
                className={`form-input ${errors.identifier ? 'error' : ''}`}
                placeholder="Enter your Login ID or email"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                autoComplete="username"
              />
              {errors.identifier && <span className="form-error">{errors.identifier}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Password <span className="required">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="signin-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--gray-400)', fontSize: 18, padding: 2,
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <button
              id="signin-submit"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <><div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--gray-500)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ fontWeight: 600 }}>Sign Up</Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--gray-400)' }}>
          Secure HR Management Platform
        </p>
      </div>
    </div>
  );
}
