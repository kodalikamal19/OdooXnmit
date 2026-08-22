import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function NewEmployee() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.role === 'employee') {
    navigate('/employees');
    return null;
  }

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    department: '', job_position: '', manager: '', location: '',
    date_of_joining: new Date().toISOString().split('T')[0],
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required.';
    if (!form.last_name.trim()) e.last_name = 'Last name is required.';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email is required.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (profileImage) fd.append('profile_image', profileImage);

    try {
      const res = await employeeApi.create(fd);
      toast.success(
        `Employee created!\nLogin ID: ${res.data.login_id}\nPassword: ${res.data.generated_password}`,
        { duration: 10000 }
      );
      navigate(`/employees/${res.data.id}`);
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.errors) setErrors(data.errors);
      else toast.error(data?.error || 'Failed to create employee.');
    } finally {
      setLoading(false);
    }
  };

  const DEPARTMENTS = ['Engineering', 'Design', 'Product', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations', 'Legal', 'Other'];

  return (
    <div className="page-container">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="page-header">
          <div>
            <button
              onClick={() => navigate('/employees')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8 }}>
              ← Back to Employees
            </button>
            <h1 className="page-title">New Employee</h1>
            <p className="page-subtitle">Create a new employee account. Login credentials will be emailed automatically.</p>
          </div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} noValidate>
            <div className="card-body">
              {/* Profile Image */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
                <div style={{ position: 'relative' }}>
                  {imagePreview ? (
                    <img src={imagePreview} alt=""
                      style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                        border: '3px solid var(--gray-200)' }} />
                  ) : (
                    <div style={{
                      width: 80, height: 80, borderRadius: '50%',
                      background: 'var(--gray-100)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 28,
                    }}>
                      👤
                    </div>
                  )}
                  <label htmlFor="profile_image_input" style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'var(--primary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid white',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                  </label>
                  <input id="profile_image_input" type="file" accept="image/*"
                    style={{ display: 'none' }} onChange={handleImageChange} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-900)' }}>Profile Photo</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                    Optional. JPG, PNG up to 5MB.
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div style={{
                background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
                borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 24,
                fontSize: 13, color: 'var(--primary)',
              }}>
                🔑 A Login ID and temporary password will be auto-generated and emailed to the employee.
              </div>

              {/* Form fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                <div className="form-group">
                  <label className="form-label">First Name <span className="required">*</span></label>
                  <input type="text" className={`form-input ${errors.first_name ? 'error' : ''}`}
                    placeholder="John" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                  {errors.first_name && <span className="form-error">{errors.first_name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Last Name <span className="required">*</span></label>
                  <input type="text" className={`form-input ${errors.last_name ? 'error' : ''}`}
                    placeholder="Doe" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                  {errors.last_name && <span className="form-error">{errors.last_name}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Work Email <span className="required">*</span></label>
                  <input type="email" className={`form-input ${errors.email ? 'error' : ''}`}
                    placeholder="john.doe@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="tel" className="form-input"
                    placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-select" value={form.department} onChange={e => set('department', e.target.value)}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Job Position</label>
                  <input type="text" className="form-input"
                    placeholder="Software Engineer" value={form.job_position} onChange={e => set('job_position', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Manager</label>
                  <input type="text" className="form-input"
                    placeholder="Manager's name" value={form.manager} onChange={e => set('manager', e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input type="text" className="form-input"
                    placeholder="Office / Remote" value={form.location} onChange={e => set('location', e.target.value)} />
                </div>

                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label className="form-label">Date of Joining</label>
                  <input type="date" className="form-input"
                    value={form.date_of_joining} onChange={e => set('date_of_joining', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/employees')}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <><div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating...</>
                ) : 'Create Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
