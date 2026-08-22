import React, { useState, useEffect } from 'react';
import api from '../../api';
import { X, UserPlus, Sparkles, CheckCircle2, Copy, Mail } from 'lucide-react';

export const NewEmployeeModal = ({ isOpen, onClose, onEmployeeCreated, company, departments }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_position: 'Software Engineer',
    department_id: '',
    location: 'Mumbai Office',
    date_of_joining: new Date().toISOString().split('T')[0],
    monthly_wage: '50000',
  });

  const [previewLoginId, setPreviewLoginId] = useState('');
  const [createdResult, setCreatedResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (formData.first_name || formData.last_name) {
      const cCode = company?.code || 'OI';
      const f = formData.first_name.trim().substring(0, 2).toUpperCase() || 'XX';
      const l = formData.last_name.trim().substring(0, 2).toUpperCase() || 'YY';
      const yr = new Date(formData.date_of_joining || new Date()).getFullYear();
      setPreviewLoginId(`${cCode}${f}${l}${yr}0001`);
    } else {
      setPreviewLoginId(`${company?.code || 'OI'}JODO${new Date().getFullYear()}0001`);
    }
  }, [formData.first_name, formData.last_name, formData.date_of_joining, company]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        department_id: formData.department_id ? parseInt(formData.department_id) : null,
        monthly_wage: parseFloat(formData.monthly_wage)
      };
      const res = await api.post('/employees/', payload);
      setCreatedResult(res.data);
      if (onEmployeeCreated) onEmployeeCreated(res.data);
    } catch (err) {
      console.error(err);
      const errData = err.response?.data;
      if (typeof errData === 'object') {
        const msg = Object.entries(errData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
        setError(msg);
      } else {
        setError(errData?.error || 'Failed to create employee.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (createdResult) {
      const text = `Login ID: ${createdResult.generated_login_id}\nPassword: ${createdResult.generated_password}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseModal = () => {
    setCreatedResult(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      job_position: 'Software Engineer',
      department_id: '',
      location: 'Mumbai Office',
      date_of_joining: new Date().toISOString().split('T')[0],
      monthly_wage: '50000',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Create New Employee</h2>
              <p className="text-xs text-slate-500">Auto-generates Login ID & Emails Initial Credentials</p>
            </div>
          </div>
          <button onClick={handleCloseModal} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {createdResult ? (
            /* Success Credentials View */
            <div className="text-center py-4 space-y-4">
              <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-600 mb-1">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Employee Created Successfully!</h3>
              
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-800 text-xs flex items-center justify-center gap-2 max-w-md mx-auto">
                <Mail className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <span>Credentials email dispatched to <strong>{createdResult.email}</strong></span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-3 font-mono text-sm max-w-md mx-auto shadow-inner">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-xs text-slate-500 font-sans">Employee Name</span>
                  <span className="text-slate-800 font-bold">{createdResult.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-sans">Auto Login ID</span>
                  <span className="text-purple-700 font-bold">{createdResult.generated_login_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-sans">Initial Password</span>
                  <span className="text-emerald-700 font-bold">{createdResult.generated_password}</span>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={copyCredentials}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all"
                >
                  <Copy className="w-4 h-4 text-purple-700" />
                  <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
                </button>
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-2 bg-purple-gradient text-white rounded-xl text-xs font-bold shadow-md shadow-purple-900/20 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Dynamic Login ID Banner */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-purple-800 font-medium">
                  <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <span>Format: <strong>[Company][Initials][Year][Serial]</strong></span>
                </div>
                <div className="text-xs font-mono font-bold bg-white px-3 py-1 rounded-lg text-purple-700 border border-purple-300 shadow-xs">
                  {previewLoginId}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="e.g. John"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="e.g. Doe"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                    required
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@company.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Position & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Job Position *
                  </label>
                  <input
                    type="text"
                    value={formData.job_position}
                    onChange={(e) => setFormData({ ...formData, job_position: e.target.value })}
                    placeholder="e.g. Software Engineer"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                  >
                    <option value="">Select Department...</option>
                    {departments?.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date of Joining & Monthly Wage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date of Joining *
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_joining}
                    onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Monthly Wage (₹) *
                  </label>
                  <input
                    type="number"
                    value={formData.monthly_wage}
                    onChange={(e) => setFormData({ ...formData, monthly_wage: e.target.value })}
                    placeholder="50000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 px-3 text-sm text-slate-800 focus:outline-none focus:border-purple-600 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-purple-gradient text-white rounded-xl text-xs font-bold shadow-md shadow-purple-900/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating Employee...' : 'Create Employee'}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
