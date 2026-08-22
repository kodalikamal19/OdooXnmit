import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { employeeApi, payrollApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { Employee, SalaryInfo } from '../../types';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';

type Tab = 'resume' | 'private_info' | 'salary_info';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <span style={{ minWidth: 160, fontSize: 13, color: 'var(--gray-500)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--gray-800)', fontWeight: 400 }}>{value || '—'}</span>
    </div>
  );
}

function CurrencyBadge({ label, value, color = 'var(--primary)' }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--gray-200)',
      borderRadius: 'var(--radius-md)', padding: '12px 16px',
    }}>
      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>
        ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
}

export default function EmployeeDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [salary, setSalary] = useState<SalaryInfo | null>(null);
  const [tab, setTab] = useState<Tab>('resume');
  const [loading, setLoading] = useState(true);
  const [newSkill, setNewSkill] = useState('');
  const [editingWage, setEditingWage] = useState(false);
  const [wageValue, setWageValue] = useState('');

  const isHR = user?.role === 'admin' || user?.role === 'hr_officer';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      employeeApi.get(id),
      isHR ? payrollApi.getSalary(id) : Promise.resolve(null),
    ]).then(([empRes, salRes]) => {
      setEmployee(empRes.data);
      if (salRes) setSalary(salRes.data);
      setWageValue(salRes?.data?.monthly_wage?.toString() || '0');
    }).catch(() => {
      toast.error('Failed to load employee.');
      navigate('/employees');
    }).finally(() => setLoading(false));
  }, [id, isHR, navigate]);

  const handleAddSkill = async () => {
    if (!newSkill.trim() || !id) return;
    try {
      const res = await employeeApi.addSkill(id, newSkill.trim());
      setEmployee(prev => prev ? { ...prev, skills: res.data.skills } : prev);
      setNewSkill('');
      toast.success('Skill added!');
    } catch { toast.error('Failed to add skill.'); }
  };

  const handleRemoveSkill = async (skill: string) => {
    if (!id) return;
    try {
      const res = await employeeApi.removeSkill(id, skill);
      setEmployee(prev => prev ? { ...prev, skills: res.data.skills } : prev);
    } catch { toast.error('Failed to remove skill.'); }
  };

  const handleWageUpdate = async () => {
    if (!id) return;
    try {
      const res = await payrollApi.updateSalary(id, { monthly_wage: parseFloat(wageValue) });
      setSalary(res.data);
      setEditingWage(false);
      toast.success('Salary updated!');
    } catch { toast.error('Failed to update salary.'); }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-overlay"><div className="loading-spinner" style={{ width: 40, height: 40 }} /></div>
      </div>
    );
  }

  if (!employee) return null;

  const imgSrc = employee.profile_image
    ? (employee.profile_image.startsWith('http') ? employee.profile_image : `${API_BASE}${employee.profile_image}`)
    : null;

  return (
    <div className="page-container">
      <div className="container" style={{ maxWidth: 900 }}>
        <div style={{ padding: '24px 0 20px' }}>
          <button onClick={() => navigate('/employees')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)',
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 16 }}>
            ← Back to Employees
          </button>

          {/* Profile Header */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body" style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              {imgSrc ? (
                <img src={imgSrc} alt={employee.full_name}
                  style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover',
                    border: '3px solid var(--gray-200)', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 96, height: 96, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary-light), var(--primary-border))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 700, color: 'var(--primary)', flexShrink: 0,
                }}>
                  {getInitials(employee.full_name)}
                </div>
              )}

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--gray-900)', marginBottom: 4 }}>
                      {employee.full_name}
                    </h2>
                    {employee.job_position && (
                      <div style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 500, marginBottom: 2 }}>
                        {employee.job_position}
                      </div>
                    )}
                    {employee.department && (
                      <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{employee.department}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-gray">{employee.login_id}</span>
                    <span className={`badge ${
                      employee.attendance_status === 'present' ? 'badge-success' :
                      employee.attendance_status === 'on_leave' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {employee.attendance_status === 'present' ? '● Present' :
                       employee.attendance_status === 'on_leave' ? '✈ On Leave' : '● Absent'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
                  {employee.email && (
                    <div style={{ fontSize: 12 }}>
                      <div style={{ color: 'var(--gray-400)', marginBottom: 2 }}>Email</div>
                      <div style={{ color: 'var(--gray-700)', fontWeight: 500 }} className="truncate">{employee.email}</div>
                    </div>
                  )}
                  {employee.manager && (
                    <div style={{ fontSize: 12 }}>
                      <div style={{ color: 'var(--gray-400)', marginBottom: 2 }}>Manager</div>
                      <div style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{employee.manager}</div>
                    </div>
                  )}
                  {employee.location && (
                    <div style={{ fontSize: 12 }}>
                      <div style={{ color: 'var(--gray-400)', marginBottom: 2 }}>Location</div>
                      <div style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{employee.location}</div>
                    </div>
                  )}
                  {employee.date_of_joining && (
                    <div style={{ fontSize: 12 }}>
                      <div style={{ color: 'var(--gray-400)', marginBottom: 2 }}>Joining Date</div>
                      <div style={{ color: 'var(--gray-700)', fontWeight: 500 }}>{employee.date_of_joining}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="card">
            <div className="card-header" style={{ padding: '0 24px' }}>
              <div className="nav-tabs">
                {([
                  ['resume', 'Resume'],
                  ['private_info', 'Private Info'],
                  ...(isHR ? [['salary_info', 'Salary Info']] : []),
                ] as [Tab, string][]).map(([key, label]) => (
                  <button key={key} className={`nav-tab ${tab === key ? 'active' : ''}`}
                    onClick={() => setTab(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-body">
              {/* ── RESUME TAB ── */}
              {tab === 'resume' && (
                <div>
                  <InfoRow label="Employee Code" value={employee.employee_code} />
                  <InfoRow label="Full Name" value={employee.full_name} />
                  <InfoRow label="Email" value={employee.email} />
                  <InfoRow label="Phone" value={employee.phone} />
                  <InfoRow label="Department" value={employee.department} />
                  <InfoRow label="Job Position" value={employee.job_position} />
                  <InfoRow label="Manager" value={employee.manager} />
                  <InfoRow label="Location" value={employee.location} />
                  <InfoRow label="Date of Joining" value={employee.date_of_joining} />
                  <InfoRow label="Login ID" value={employee.login_id} />
                </div>
              )}

              {/* ── PRIVATE INFO TAB ── */}
              {tab === 'private_info' && (
                <div>
                  {isHR && (
                    <>
                      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>
                        About & Interests
                      </h4>
                      <InfoRow label="About Job" value={employee.about_job} />
                      <div style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                        <div style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 500, marginBottom: 8 }}>Interests</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(employee.interests || []).map(i => (
                            <span key={i} className="badge badge-info">{i}</span>
                          ))}
                          {!employee.interests?.length && <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>None listed</span>}
                        </div>
                      </div>
                      <div style={{ padding: '10px 0', borderBottom: '1px solid var(--gray-100)', marginBottom: 20 }}>
                        <div style={{ fontSize: 13, color: 'var(--gray-500)', fontWeight: 500, marginBottom: 8 }}>Hobbies</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {(employee.hobbies || []).map(h => (
                            <span key={h} className="badge badge-gray">{h}</span>
                          ))}
                          {!employee.hobbies?.length && <span style={{ fontSize: 13, color: 'var(--gray-400)' }}>None listed</span>}
                        </div>
                      </div>

                      {/* Skills */}
                      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>
                        Skills
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                        {(employee.skills || []).map(skill => (
                          <div key={skill} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
                            borderRadius: 99, padding: '4px 10px',
                          }}>
                            <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 500 }}>{skill}</span>
                            <button onClick={() => handleRemoveSkill(skill)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--primary)', fontSize: 12, padding: 0, lineHeight: 1 }}>
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                        <input type="text" className="form-input" placeholder="Add skill..."
                          value={newSkill} onChange={e => setNewSkill(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                          style={{ maxWidth: 280 }} />
                        <button className="btn btn-secondary btn-sm" onClick={handleAddSkill}>Add</button>
                      </div>

                      {/* Certifications */}
                      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>
                        Certifications
                      </h4>
                      {(employee.certifications || []).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                          {employee.certifications.map(cert => (
                            <div key={cert.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '10px 14px',
                              background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 8,
                            }}>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{cert.name}</div>
                                {cert.issuer && <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{cert.issuer} · {cert.date}</div>}
                              </div>
                              <button onClick={async () => {
                                if (!id) return;
                                await employeeApi.removeCertification(id, cert.id);
                                setEmployee(prev => prev ? {
                                  ...prev,
                                  certifications: prev.certifications.filter(c => c.id !== cert.id)
                                } : prev);
                              }} style={{ background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--danger)', fontSize: 16 }}>
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 12 }}>No certifications added.</p>
                      )}
                    </>
                  )}

                  {/* Personal Info (visible to all) */}
                  <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)', marginTop: isHR ? 0 : 0 }}>
                    Personal Information
                  </h4>
                  <InfoRow label="Date of Birth" value={employee.date_of_birth} />
                  <InfoRow label="Gender" value={employee.gender} />
                  <InfoRow label="Marital Status" value={employee.marital_status} />
                  <InfoRow label="Nationality" value={employee.nationality} />
                  <InfoRow label="Personal Email" value={employee.personal_email} />
                  <InfoRow label="Address" value={employee.address} />

                  {isHR && (
                    <>
                      <h4 style={{ fontSize: 14, fontWeight: 600, margin: '20px 0 12px', color: 'var(--gray-700)' }}>
                        Bank Details
                      </h4>
                      <InfoRow label="Account Number" value={employee.bank_account} />
                      <InfoRow label="Bank Name" value={employee.bank_name} />
                      <InfoRow label="IFSC Code" value={employee.ifsc_code} />
                      <InfoRow label="PAN Number" value={employee.pan_number} />
                    </>
                  )}
                </div>
              )}

              {/* ── SALARY INFO TAB (HR/Admin only) ── */}
              {tab === 'salary_info' && isHR && salary && (
                <div>
                  {/* Wage Configuration */}
                  <div style={{
                    background: 'var(--primary-light)', border: '1px solid var(--primary-border)',
                    borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 24,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)' }}>Wage Configuration</h4>
                      <button className="btn btn-primary btn-sm"
                        onClick={() => editingWage ? handleWageUpdate() : setEditingWage(true)}>
                        {editingWage ? 'Save' : 'Edit'}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>Monthly Wage</div>
                        {editingWage ? (
                          <input type="number" className="form-input"
                            value={wageValue} onChange={e => setWageValue(e.target.value)} />
                        ) : (
                          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>
                            ₹{salary.monthly_wage.toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>Yearly Wage</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)' }}>
                          ₹{salary.yearly_wage.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>Working Days/Week</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)' }}>
                          {salary.working_days_per_week} days
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                      <InfoRow label="Working Schedule" value={salary.working_schedule} />
                      <InfoRow label="Break Time" value={`${salary.break_time_minutes} min`} />
                    </div>
                  </div>

                  {/* Salary Components */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>
                        Salary Components
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <CurrencyBadge label="Basic Salary" value={salary.components.basic_salary} color="var(--primary)" />
                        <CurrencyBadge label="House Rent Allowance" value={salary.components.house_rent_allowance} />
                        <CurrencyBadge label="Standard Allowance" value={salary.components.standard_allowance} />
                        <CurrencyBadge label="Performance Bonus" value={salary.components.performance_bonus} color="var(--success)" />
                        <CurrencyBadge label="Leave Travel Allowance" value={salary.components.leave_travel_allowance} />
                        <CurrencyBadge label="Fixed Allowance" value={salary.components.fixed_allowance} />
                      </div>
                    </div>

                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--gray-700)' }}>
                        Provident Fund
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <CurrencyBadge label={`Employee PF (${salary.provident_fund.employee_pf_percentage}%)`}
                          value={salary.provident_fund.employee_pf_amount} color="var(--warning)" />
                        <CurrencyBadge label={`Employer PF (${salary.provident_fund.employer_pf_percentage}%)`}
                          value={salary.provident_fund.employer_pf_amount} color="var(--info)" />
                        <div style={{
                          background: 'var(--white)', border: '1px solid var(--gray-200)',
                          borderRadius: 'var(--radius-md)', padding: '12px 16px',
                        }}>
                          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>Professional Tax</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)' }}>
                            ₹{salary.provident_fund.professional_tax.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    marginTop: 20, padding: 12, background: 'var(--success-light)',
                    border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)',
                    fontSize: 12, color: '#065F46',
                  }}>
                    💡 Salary components are automatically calculated based on the monthly wage and defined percentages.
                    Changing the wage will recalculate all percentage-based components.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
