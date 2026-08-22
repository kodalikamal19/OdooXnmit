import { useState, useEffect } from 'react';
import { employeeApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { Employee } from '../../types';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <span style={{ minWidth: 160, fontSize: 13, color: 'var(--gray-500)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--gray-800)' }}>{value || '—'}</span>
    </div>
  );
}

type Tab = 'info' | 'private' | 'resume';

export default function MyProfile() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('info');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    date_of_birth: '', address: '', nationality: '', personal_email: '',
    gender: '', marital_status: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    employeeApi.me().then(res => {
      setEmployee(res.data);
      setForm({
        date_of_birth: res.data.date_of_birth || '',
        address: res.data.address || '',
        nationality: res.data.nationality || '',
        personal_email: res.data.personal_email || '',
        gender: res.data.gender || '',
        marital_status: res.data.marital_status || '',
      });
    }).catch(() => {
      // Admin without employee profile — show basic info
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!employee) return;
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      const res = await employeeApi.update(employee.id, fd);
      setEmployee(res.data);
      setEditing(false);
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile.'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-overlay"><div className="loading-spinner" style={{ width: 40, height: 40 }} /></div>
      </div>
    );
  }

  const imgSrc = employee?.profile_image
    ? (employee.profile_image.startsWith('http') ? employee.profile_image : `${API_BASE}${employee.profile_image}`)
    : null;

  const displayName = employee?.full_name || user?.email || 'User';

  return (
    <div className="page-container">
      <div className="container" style={{ maxWidth: 900 }}>
        <div style={{ padding: '24px 0 20px' }}>
          <h1 className="page-title" style={{ marginBottom: 20 }}>My Profile</h1>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
            {/* Left: Main profile */}
            <div>
              {/* Profile header card */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-body" style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  {imgSrc ? (
                    <img src={imgSrc} alt={displayName}
                      style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover',
                        border: '3px solid var(--gray-200)' }} />
                  ) : (
                    <div style={{
                      width: 80, height: 80, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--primary-light), var(--primary-border))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, fontWeight: 700, color: 'var(--primary)',
                    }}>
                      {getInitials(displayName)}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{displayName}</h2>
                    {employee?.job_position && (
                      <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500, marginBottom: 2 }}>
                        {employee.job_position}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      <span className="badge badge-gray">{user?.role?.replace('_', ' ')}</span>
                      {employee?.department && (
                        <span className="badge badge-info">{employee.department}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="card">
                <div className="card-header" style={{ padding: '0 24px' }}>
                  <div className="nav-tabs">
                    <button className={`nav-tab ${tab === 'info' ? 'active' : ''}`} onClick={() => setTab('info')}>Basic Info</button>
                    {employee && (
                      <>
                        <button className={`nav-tab ${tab === 'private' ? 'active' : ''}`} onClick={() => setTab('private')}>Private Info</button>
                        <button className={`nav-tab ${tab === 'resume' ? 'active' : ''}`} onClick={() => setTab('resume')}>Resume</button>
                      </>
                    )}
                  </div>
                </div>

                <div className="card-body">
                  {tab === 'info' && employee && (
                    <div>
                      <InfoRow label="Full Name" value={employee.full_name} />
                      <InfoRow label="Email" value={employee.email} />
                      <InfoRow label="Phone" value={employee.phone} />
                      <InfoRow label="Job Position" value={employee.job_position} />
                      <InfoRow label="Department" value={employee.department} />
                      <InfoRow label="Manager" value={employee.manager} />
                      <InfoRow label="Location" value={employee.location} />
                      <InfoRow label="Date of Joining" value={employee.date_of_joining} />
                      <InfoRow label="Employee Code" value={employee.employee_code} />
                      <InfoRow label="Login ID" value={employee.login_id} />
                    </div>
                  )}

                  {tab === 'info' && !employee && (
                    <div>
                      <InfoRow label="Full Name" value={user?.name} />
                      <InfoRow label="Email" value={user?.email} />
                      <InfoRow label="Phone" value={user?.phone} />
                      <InfoRow label="Role" value={user?.role} />
                      <div style={{ marginTop: 16, padding: '12px', background: 'var(--gray-50)', borderRadius: 8, fontSize: 13, color: 'var(--gray-500)' }}>
                        You are logged in as a company administrator. Admin accounts do not have an associated employee profile (Private Info, Resume, Bank Details).
                      </div>
                    </div>
                  )}

                  {tab === 'private' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                        {!editing ? (
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
                        ) : (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        )}
                      </div>

                      {editing ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                          {[
                            { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
                            { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other', 'Prefer not to say'] },
                            { key: 'marital_status', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
                            { key: 'nationality', label: 'Nationality', type: 'text' },
                            { key: 'personal_email', label: 'Personal Email', type: 'email' },
                            { key: 'address', label: 'Address', type: 'text' },
                          ].map(field => (
                            <div key={field.key} className="form-group"
                              style={{ gridColumn: field.key === 'address' ? '1/-1' : undefined }}>
                              <label className="form-label">{field.label}</label>
                              {field.type === 'select' ? (
                                <select className="form-select"
                                  value={(form as any)[field.key]}
                                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}>
                                  <option value="">Select...</option>
                                  {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              ) : (
                                <input type={field.type} className="form-input"
                                  value={(form as any)[field.key]}
                                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))} />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <InfoRow label="Date of Birth" value={employee?.date_of_birth} />
                          <InfoRow label="Gender" value={employee?.gender} />
                          <InfoRow label="Marital Status" value={employee?.marital_status} />
                          <InfoRow label="Nationality" value={employee?.nationality} />
                          <InfoRow label="Personal Email" value={employee?.personal_email} />
                          <InfoRow label="Address" value={employee?.address} />
                        </>
                      )}
                    </div>
                  )}

                  {tab === 'resume' && employee && (
                    <div>
                      {employee.skills?.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--gray-700)' }}>Skills</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {employee.skills.map(s => (
                              <span key={s} className="badge badge-info">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {employee.certifications?.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--gray-700)' }}>Certifications</h4>
                          {employee.certifications.map(cert => (
                            <div key={cert.id} style={{
                              padding: '10px 14px', background: 'var(--gray-50)',
                              border: '1px solid var(--gray-200)', borderRadius: 8, marginBottom: 8,
                            }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{cert.name}</div>
                              {cert.issuer && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{cert.issuer} · {cert.date}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                      {!employee.skills?.length && !employee.certifications?.length && (
                        <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>No resume information available.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Bank details */}
            {employee && (
              <div>
                <div className="card">
                  <div className="card-header">
                    <h3 style={{ fontSize: 14, fontWeight: 600 }}>Bank Details</h3>
                  </div>
                  <div className="card-body">
                    <InfoRow label="Account No." value={employee.bank_account ? '••••' + employee.bank_account.slice(-4) : undefined} />
                    <InfoRow label="Bank Name" value={employee.bank_name} />
                    <InfoRow label="IFSC Code" value={employee.ifsc_code} />
                    <InfoRow label="PAN Number" value={employee.pan_number ? employee.pan_number.slice(0,3) + '••••' + employee.pan_number.slice(-1) : undefined} />
                    <InfoRow label="Employee Code" value={employee.employee_code} />
                    <div style={{
                      marginTop: 12, padding: '10px 12px', background: 'var(--gray-50)',
                      borderRadius: 8, fontSize: 12, color: 'var(--gray-500)',
                    }}>
                      🔒 Sensitive details are masked. Contact HR to update.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
