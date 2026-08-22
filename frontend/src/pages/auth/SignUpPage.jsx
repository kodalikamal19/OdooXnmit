import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, Upload, Building, User, Mail, Phone, Lock, AlertCircle } from 'lucide-react';

export const SignUpPage = () => {
  const [formData, setFormData] = useState({
    company_name: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: '',
  });
  const [companyLogo, setCompanyLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCompanyLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      if (companyLogo) {
        data.append('company_logo', companyLogo);
      }

      await signUp(data);
      navigate('/employees');
    } catch (err) {
      console.error(err);
      const errRes = err.response?.data;
      if (typeof errRes === 'object') {
        const msg = Object.entries(errRes).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
        setError(msg);
      } else {
        setError(errRes?.error || 'Registration failed.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white p-8 rounded-2xl shadow-xl border border-slate-200 my-8">
        
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-purple-gradient items-center justify-center text-white font-bold text-2xl shadow-lg shadow-purple-900/20 mb-2">
            <span className="font-serif italic">o</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Create Company Account</h1>
          <p className="text-xs text-slate-500 mt-1">Set up your company workspace on Dayflow HRMS</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Company Name & Logo
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="e.g. Odoo India"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                  required
                />
              </div>
              
              <label className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl cursor-pointer text-xs font-semibold text-slate-700 transition-all">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-5 h-5 rounded object-cover" />
                ) : (
                  <Upload className="w-4 h-4 text-purple-700" />
                )}
                <span>Upload Logo</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Admin Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="First & Last Name"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="admin@company.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 8 chars"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-8 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  placeholder="Confirm password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-8 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-purple-gradient hover:opacity-95 shadow-lg shadow-purple-900/20 transition-all mt-4 disabled:opacity-50"
          >
            {submitting ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link to="/signin" className="text-purple-700 hover:text-purple-800 font-bold underline underline-offset-4">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};
