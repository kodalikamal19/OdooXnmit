import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Plane, Building2, Briefcase } from 'lucide-react';
import { NewEmployeeModal } from '../../components/employees/NewEmployeeModal';
import { EmployeeDetailModal } from '../../components/employees/EmployeeDetailModal';

export const EmployeesPage = () => {
  const { user, company } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const isAdminOrHR = user?.role in ['ADMIN', 'HR_OFFICER'] || user?.role === 'ADMIN' || user?.role === 'HR_OFFICER';

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees/', {
        params: { search: search.trim() }
      });
      setEmployees(res.data.results || res.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments/');
      setDepartments(res.data.results || res.data);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, [search]);

  const handleCardClick = (empId) => {
    setSelectedEmpId(empId);
    setShowDetailModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      
      {/* Subnav Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-4">
          {isAdminOrHR && (
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-purple-gradient hover:opacity-95 text-white rounded-xl font-bold text-sm shadow-md shadow-purple-900/10 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          )}
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">Employees Directory</h1>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees by name, ID, position..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Grid of Interactive Employee Cards */}
      {loading ? (
        <div className="py-20 text-center text-slate-500 text-sm">Loading employee cards...</div>
      ) : employees.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-xs p-8">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-semibold text-sm">No employees found.</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or create a new employee.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {employees.map(emp => {
            const isPresent = emp.status_indicator === 'PRESENT';
            const isOnLeave = emp.status_indicator === 'ON_LEAVE';
            const isAbsent = emp.status_indicator === 'ABSENT';

            return (
              <div
                key={emp.id}
                onClick={() => handleCardClick(emp.id)}
                className="relative glass-card p-5 rounded-2xl cursor-pointer flex flex-col items-center text-center group border border-slate-200 bg-white"
              >
                {/* Top-Right Status Indicator Icon */}
                <div className="absolute top-4 right-4" title={`Status: ${emp.status_indicator}`}>
                  {isPresent && (
                    <span className="relative flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-xs"></span>
                    </span>
                  )}
                  {isOnLeave && (
                    <div className="p-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                      <Plane className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {isAbsent && (
                    <span className="inline-flex rounded-full h-3.5 w-3.5 bg-amber-400 shadow-xs"></span>
                  )}
                </div>

                {/* Profile Picture */}
                <div className="mb-3 relative">
                  {emp.profile_picture ? (
                    <img src={emp.profile_picture} alt={emp.name} className="w-20 h-20 rounded-full object-cover border-2 border-purple-200 group-hover:border-purple-600 transition-colors shadow-sm" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-purple-gradient text-white font-bold text-2xl flex items-center justify-center border-2 border-purple-200 group-hover:border-purple-600 transition-colors shadow-sm">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                  )}
                </div>

                {/* Employee Details */}
                <h3 className="font-bold text-slate-800 text-base group-hover:text-purple-700 transition-colors truncate max-w-full">
                  {emp.name}
                </h3>

                <p className="text-xs text-purple-700 font-semibold mt-0.5 truncate max-w-full flex items-center justify-center gap-1">
                  <Briefcase className="w-3 h-3 text-purple-600" /> {emp.job_position}
                </p>

                <span className="mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200">
                  {emp.login_id}
                </span>

                <p className="text-[11px] text-slate-500 mt-2 truncate max-w-full font-medium">
                  {emp.department_name || 'General Staff'}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <NewEmployeeModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onEmployeeCreated={() => fetchEmployees()}
        company={company}
        departments={departments}
      />

      <EmployeeDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        employeeId={selectedEmpId}
        onUpdate={() => fetchEmployees()}
      />

    </div>
  );
};
