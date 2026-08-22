import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { 
  X, Briefcase, User, DollarSign, Shield, Award, Plus, 
  Mail, Phone, Save
} from 'lucide-react';

export const EmployeeDetailModal = ({ isOpen, onClose, employeeId, onUpdate }) => {
  const { user: currentUser } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('resume');
  const [loading, setLoading] = useState(true);

  // Editable Private Info state
  const [privateData, setPrivateData] = useState({
    date_of_birth: '',
    residing_address: '',
    nationality: 'Indian',
    personal_email: '',
    gender: 'Male',
    marital_status: 'Single',
    about: '',
    job_love_reason: '',
    interests_hobbies: '',
    phone: ''
  });

  // Editable Salary Info state
  const [monthlyWage, setMonthlyWage] = useState(50000);
  const [workingDays, setWorkingDays] = useState(5);
  const [breakTime, setBreakTime] = useState(1);
  const [savingSalary, setSavingSalary] = useState(false);

  // Security / Password Change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });

  // Add Skill / Cert Modals
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('Intermediate');

  const [showAddCert, setShowAddCert] = useState(false);
  const [certTitle, setCertTitle] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certDate, setCertDate] = useState(new Date().toISOString().split('T')[0]);

  const isAdminOrHR = currentUser?.role in ['ADMIN', 'HR_OFFICER'] || currentUser?.role === 'ADMIN' || currentUser?.role === 'HR_OFFICER';
  const isOwnProfile = employee?.user === currentUser?.id;

  const fetchEmployeeDetail = async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const res = await api.get(`/employees/${employeeId}/`);
      setEmployee(res.data);
      
      setPrivateData({
        date_of_birth: res.data.date_of_birth || '',
        residing_address: res.data.residing_address || '',
        nationality: res.data.nationality || 'Indian',
        personal_email: res.data.personal_email || '',
        gender: res.data.gender || 'Male',
        marital_status: res.data.marital_status || 'Single',
        about: res.data.about || '',
        job_love_reason: res.data.job_love_reason || '',
        interests_hobbies: res.data.interests_hobbies || '',
        phone: res.data.phone || ''
      });

      if (res.data.salary_info) {
        setMonthlyWage(res.data.salary_info.monthly_wage);
        setWorkingDays(res.data.salary_info.working_days_per_week);
        setBreakTime(res.data.salary_info.break_time_hrs);
      }
    } catch (err) {
      console.error('Error fetching employee:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchEmployeeDetail();
    }
  }, [isOpen, employeeId]);

  if (!isOpen) return null;

  // Dynamic Salary Calculations
  const wageNum = parseFloat(monthlyWage) || 0;
  const yearlyWage = wageNum * 12;
  const basicSalary = wageNum * 0.50;
  const hra = basicSalary * 0.50;
  const standardAllowance = wageNum * (16.67 / 100.0);
  const performanceBonus = basicSalary * (8.33 / 100.0);
  const lta = basicSalary * (8.33 / 100.0);
  const totalAllocated = basicSalary + hra + standardAllowance + performanceBonus + lta;
  const fixedAllowance = Math.max(0, wageNum - totalAllocated);

  const employeePf = basicSalary * 0.12;
  const employerPf = basicSalary * 0.12;
  const professionalTax = 200.00;

  const handleSavePrivateInfo = async () => {
    try {
      await api.patch(`/employees/${employeeId}/update_private_info/`, privateData);
      fetchEmployeeDetail();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSalaryInfo = async () => {
    try {
      setSavingSalary(true);
      await api.patch(`/employees/${employeeId}/update_salary_info/`, {
        monthly_wage: wageNum,
        working_days_per_week: workingDays,
        break_time_hrs: breakTime
      });
      fetchEmployeeDetail();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSalary(false);
    }
  };

  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;
    try {
      await api.post('/skills/', {
        employee: employeeId,
        name: newSkillName,
        level: newSkillLevel
      });
      setNewSkillName('');
      setShowAddSkill(false);
      fetchEmployeeDetail();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCertification = async () => {
    if (!certTitle.trim() || !certIssuer.trim()) return;
    try {
      await api.post('/certifications/', {
        employee: employeeId,
        title: certTitle,
        issuer: certIssuer,
        issue_date: certDate
      });
      setCertTitle('');
      setCertIssuer('');
      setShowAddCert(false);
      fetchEmployeeDetail();
    } catch (err) {
      console.error(err);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: '', text: '' });
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    try {
      await api.post('/auth/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
        confirm_new_password: confirmPassword
      });
      setPwdMsg({ type: 'success', text: 'Password changed successfully!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.response?.data?.old_password || 'Password change failed.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>My Profile / Employee View</span>
            {employee && (
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                {employee.login_id}
              </span>
            )}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading employee details...</div>
        ) : employee ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Profile Header Card */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center gap-6 shadow-xs">
              <div className="relative group">
                {employee.profile_picture ? (
                  <img src={employee.profile_picture} alt="Profile" className="w-24 h-24 rounded-2xl object-cover border-2 border-purple-300 shadow-sm" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-purple-gradient text-white font-bold text-3xl flex items-center justify-center shadow-sm">
                    {employee.first_name[0]}{employee.last_name[0]}
                  </div>
                )}
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 mb-1">{employee.name}</h1>
                  <p className="text-purple-700 font-semibold mb-3 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-purple-600" />
                    <span>{employee.job_position}</span>
                  </p>
                  <div className="space-y-1.5 text-slate-600">
                    <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> {employee.email}</p>
                    <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {employee.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-2 text-slate-600 md:border-l md:border-slate-200 md:pl-6">
                  <p className="flex items-center justify-between"><span className="text-slate-400">Company:</span> <span className="font-semibold text-slate-800">{employee.company_name}</span></p>
                  <p className="flex items-center justify-between"><span className="text-slate-400">Department:</span> <span className="font-semibold text-slate-800">{employee.department_name || 'N/A'}</span></p>
                  <p className="flex items-center justify-between"><span className="text-slate-400">Manager:</span> <span className="font-semibold text-slate-800">{employee.manager_name || 'N/A'}</span></p>
                  <p className="flex items-center justify-between"><span className="text-slate-400">Location:</span> <span className="font-semibold text-slate-800">{employee.location}</span></p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setActiveTab('resume')}
                className={`px-5 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'resume' ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Resume</span>
              </button>

              <button
                onClick={() => setActiveTab('private')}
                className={`px-5 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'private' ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Private Info</span>
              </button>

              {isAdminOrHR && (
                <button
                  onClick={() => setActiveTab('salary')}
                  className={`px-5 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'salary' ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Salary Info</span>
                </button>
              )}

              {(isOwnProfile || isAdminOrHR) && (
                <button
                  onClick={() => setActiveTab('security')}
                  className={`px-5 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${
                    activeTab === 'security' ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Security</span>
                </button>
              )}
            </div>

            {/* TAB CONTENT: RESUME */}
            {activeTab === 'resume' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Education & Experience Timeline</h3>
                  {employee.resume_items && employee.resume_items.length > 0 ? (
                    <div className="space-y-3">
                      {employee.resume_items.map(item => (
                        <div key={item.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
                              <p className="text-xs text-purple-700 font-semibold">{item.organization}</p>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500">
                              {item.start_date} to {item.end_date || 'Present'}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-600 mt-2">{item.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic p-4 bg-slate-50 rounded-xl">No resume items specified yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: PRIVATE INFO */}
            {activeTab === 'private' && (
              <div className="space-y-6">
                {isAdminOrHR ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">About</label>
                        <textarea
                          rows={3}
                          value={privateData.about}
                          onChange={(e) => setPrivateData({ ...privateData, about: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-600"
                        />
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">What I love about my job</label>
                        <textarea
                          rows={3}
                          value={privateData.job_love_reason}
                          onChange={(e) => setPrivateData({ ...privateData, job_love_reason: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-600"
                        />
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">My interests and hobbies</label>
                        <textarea
                          rows={3}
                          value={privateData.interests_hobbies}
                          onChange={(e) => setPrivateData({ ...privateData, interests_hobbies: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-purple-600"
                        />
                      </div>

                      <button
                        onClick={handleSavePrivateInfo}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-gradient text-white rounded-xl text-xs font-bold shadow-md shadow-purple-900/10 transition-all"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Private Information</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Skills</h4>
                          <button
                            onClick={() => setShowAddSkill(true)}
                            className="text-xs text-purple-700 hover:text-purple-800 font-bold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Skill
                          </button>
                        </div>

                        {showAddSkill && (
                          <div className="mb-3 p-3 bg-white rounded-lg border border-slate-300 space-y-2">
                            <input
                              type="text"
                              placeholder="Skill name (e.g. React, Python)"
                              value={newSkillName}
                              onChange={(e) => setNewSkillName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800"
                            />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setShowAddSkill(false)} className="px-2 py-1 text-xs text-slate-500 font-medium">Cancel</button>
                              <button onClick={handleAddSkill} className="px-3 py-1 bg-purple-700 text-white rounded text-xs font-bold">Add</button>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {employee.skills?.map(s => (
                            <span key={s.id} className="px-3 py-1 bg-purple-100 border border-purple-200 rounded-lg text-xs text-purple-800 font-semibold">
                              {s.name} ({s.level})
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Certifications</h4>
                          <button
                            onClick={() => setShowAddCert(true)}
                            className="text-xs text-purple-700 hover:text-purple-800 font-bold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Certification
                          </button>
                        </div>

                        {showAddCert && (
                          <div className="mb-3 p-3 bg-white rounded-lg border border-slate-300 space-y-2">
                            <input
                              type="text"
                              placeholder="Certification title"
                              value={certTitle}
                              onChange={(e) => setCertTitle(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800"
                            />
                            <input
                              type="text"
                              placeholder="Issuer (e.g. AWS, Cisco)"
                              value={certIssuer}
                              onChange={(e) => setCertIssuer(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded p-1.5 text-xs text-slate-800"
                            />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setShowAddCert(false)} className="px-2 py-1 text-xs text-slate-500 font-medium">Cancel</button>
                              <button onClick={handleAddCertification} className="px-3 py-1 bg-purple-700 text-white rounded text-xs font-bold">Add</button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          {employee.certifications?.map(c => (
                            <div key={c.id} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex justify-between items-center">
                              <div>
                                <p className="font-bold text-slate-800">{c.title}</p>
                                <p className="text-slate-500 text-[11px] font-medium">{c.issuer}</p>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">{c.issue_date}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2">
                        Personal Information
                      </h4>
                      <p className="flex justify-between"><span className="text-slate-500">Date of Birth:</span> <span className="text-slate-800 font-semibold">{employee.date_of_birth || 'N/A'}</span></p>
                      <p className="flex justify-between"><span className="text-slate-500">Residing Address:</span> <span className="text-slate-800 font-semibold">{employee.residing_address || 'N/A'}</span></p>
                      <p className="flex justify-between"><span className="text-slate-500">Nationality:</span> <span className="text-slate-800 font-semibold">{employee.nationality}</span></p>
                      <p className="flex justify-between"><span className="text-slate-500">Personal Email:</span> <span className="text-slate-800 font-semibold">{employee.personal_email || employee.email}</span></p>
                      <p className="flex justify-between"><span className="text-slate-500">Gender:</span> <span className="text-slate-800 font-semibold">{employee.gender}</span></p>
                      <p className="flex justify-between"><span className="text-slate-500">Marital Status:</span> <span className="text-slate-800 font-semibold">{employee.marital_status}</span></p>
                      <p className="flex justify-between"><span className="text-slate-500">Date of Joining:</span> <span className="text-slate-800 font-semibold">{employee.date_of_joining}</span></p>
                    </div>

                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2">
                        Bank Details (View-Only)
                      </h4>
                      {employee.bank_details ? (
                        <>
                          <p className="flex justify-between"><span className="text-slate-500">Account Number:</span> <span className="font-mono text-slate-800 font-bold">{employee.bank_details.account_number}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">Bank Name:</span> <span className="text-slate-800 font-semibold">{employee.bank_details.bank_name}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">IFSC Code:</span> <span className="font-mono text-slate-800 font-bold">{employee.bank_details.ifsc_code}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">PAN Number:</span> <span className="font-mono text-slate-800 font-bold">{employee.bank_details.pan_number}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">UAN Number:</span> <span className="font-mono text-slate-800 font-bold">{employee.bank_details.uan_number || 'N/A'}</span></p>
                          <p className="flex justify-between"><span className="text-slate-500">Employee Code:</span> <span className="font-mono text-purple-700 font-bold">{employee.bank_details.employee_code}</span></p>
                        </>
                      ) : (
                        <p className="text-slate-400 italic">No bank details recorded.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: SALARY INFO (ADMIN ONLY) */}
            {activeTab === 'salary' && isAdminOrHR && (
              <div className="space-y-6 text-xs">
                
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Monthly Wage (₹)</label>
                    <input
                      type="number"
                      value={monthlyWage}
                      onChange={(e) => setMonthlyWage(e.target.value)}
                      className="w-full bg-white border border-purple-400 rounded-lg p-2 text-sm font-bold text-purple-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Yearly Wage (₹)</label>
                    <div className="p-2 bg-emerald-50 rounded-lg text-sm font-bold text-emerald-700 border border-emerald-200">
                      ₹{yearlyWage.toLocaleString('en-IN')} / Yearly
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Working Days / Week</label>
                    <input
                      type="number"
                      value={workingDays}
                      onChange={(e) => setWorkingDays(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Break Time (Hrs)</label>
                    <input
                      type="number"
                      value={breakTime}
                      onChange={(e) => setBreakTime(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  <div className="md:col-span-2 p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2">
                      Salary Components (Dynamic Calculation)
                    </h4>

                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-200">
                        <div>
                          <p className="font-bold text-slate-800">Basic Salary</p>
                          <p className="text-[10px] text-slate-500">50% of monthly wage</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800">₹{basicSalary.toFixed(2)}</span>
                          <span className="text-[10px] text-purple-700 block font-mono font-bold">50.00%</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-200">
                        <div>
                          <p className="font-bold text-slate-800">House Rent Allowance (HRA)</p>
                          <p className="text-[10px] text-slate-500">50% of Basic salary</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800">₹{hra.toFixed(2)}</span>
                          <span className="text-[10px] text-purple-700 block font-mono font-bold">50.00%</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-200">
                        <div>
                          <p className="font-bold text-slate-800">Standard Allowance</p>
                          <p className="text-[10px] text-slate-500">16.67% of monthly wage</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800">₹{standardAllowance.toFixed(2)}</span>
                          <span className="text-[10px] text-purple-700 block font-mono font-bold">16.67%</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-200">
                        <div>
                          <p className="font-bold text-slate-800">Performance Bonus</p>
                          <p className="text-[10px] text-slate-500">8.33% of Basic salary</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800">₹{performanceBonus.toFixed(2)}</span>
                          <span className="text-[10px] text-purple-700 block font-mono font-bold">8.33%</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-200">
                        <div>
                          <p className="font-bold text-slate-800">Leave Travel Allowance (LTA)</p>
                          <p className="text-[10px] text-slate-500">8.33% of Basic salary</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-800">₹{lta.toFixed(2)}</span>
                          <span className="text-[10px] text-purple-700 block font-mono font-bold">8.33%</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-2.5 bg-purple-50 rounded-lg border border-purple-200">
                        <div>
                          <p className="font-bold text-purple-900">Fixed Allowance</p>
                          <p className="text-[10px] text-slate-500">Remaining wage portion</p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-purple-900">₹{fixedAllowance.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider border-b border-slate-200 pb-2">
                        Provident Fund (PF)
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Employee PF (12%):</span>
                          <span className="font-bold text-slate-800">₹{employeePf.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Employer PF (12%):</span>
                          <span className="font-bold text-slate-800">₹{employerPf.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider border-b border-slate-200 pb-2">
                        Tax Deductions
                      </h4>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Professional Tax:</span>
                        <span className="font-bold text-slate-800">₹{professionalTax.toFixed(2)} / mo</span>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveSalaryInfo}
                      disabled={savingSalary}
                      className="w-full py-2.5 bg-purple-gradient text-white font-bold rounded-xl shadow-md shadow-purple-900/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingSalary ? 'Saving...' : 'Update Salary Structure'}</span>
                    </button>
                  </div>

                </div>

              </div>
            )}

            {/* TAB CONTENT: SECURITY */}
            {activeTab === 'security' && (
              <div className="max-w-md space-y-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Change Password</h3>
                
                {pwdMsg.text && (
                  <div className={`p-3 rounded-lg text-xs font-medium ${pwdMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {pwdMsg.text}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Current Password</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800"
                      required
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-purple-gradient text-white rounded-lg font-bold">
                    Update Password
                  </button>
                </form>
              </div>
            )}

          </div>
        ) : null}

      </div>
    </div>
  );
};
