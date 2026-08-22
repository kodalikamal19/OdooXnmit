import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 (token expired)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
          const { access } = res.data;
          localStorage.setItem('access_token', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (identifier: string, password: string) =>
    api.post('/auth/login/', { identifier, password }),
  signup: (data: FormData) =>
    api.post('/auth/signup/', data, { headers: { 'Content-Type': 'application/json' } }),
  refresh: (refresh: string) =>
    api.post('/auth/token/refresh/', { refresh }),
  changePassword: (data: object) =>
    api.post('/auth/change-password/', data),
  me: () =>
    api.get('/auth/me/'),
};

// ─── Company ───────────────────────────────────────────────────────────────
export const companyApi = {
  get: () => api.get('/companies/'),
  update: (id: string, data: FormData) =>
    api.put(`/companies/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ─── Employees ─────────────────────────────────────────────────────────────
export const employeeApi = {
  list: (search?: string) =>
    api.get('/employees/', { params: search ? { search } : {} }),
  get: (id: string) =>
    api.get(`/employees/${id}/`),
  me: () =>
    api.get('/employees/me/'),
  create: (data: FormData) =>
    api.post('/employees/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: FormData) =>
    api.put(`/employees/${id}/`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  addSkill: (id: string, skill: string) =>
    api.post(`/employees/${id}/skills/`, { skill }),
  removeSkill: (id: string, skill: string) =>
    api.delete(`/employees/${id}/skills/`, { data: { skill } }),
  addCertification: (id: string, cert: object) =>
    api.post(`/employees/${id}/certifications/`, cert),
  removeCertification: (id: string, certId: string) =>
    api.delete(`/employees/${id}/certifications/`, { data: { id: certId } }),
};

// ─── Attendance ────────────────────────────────────────────────────────────
export const attendanceApi = {
  checkIn: () => api.post('/attendance/check-in/'),
  checkOut: () => api.post('/attendance/check-out/'),
  todayStatus: () => api.get('/attendance/today/'),
  myAttendance: (year: number, month: number) =>
    api.get('/attendance/my/', { params: { year, month } }),
  adminAttendance: (date: string, search?: string) =>
    api.get('/attendance/all/', { params: { date, search } }),
};

// ─── Time Off ──────────────────────────────────────────────────────────────
export const timeOffApi = {
  allocations: () => api.get('/timeoff/allocations/'),
  requests: (search?: string) =>
    api.get('/timeoff/requests/', { params: search ? { search } : {} }),
  createRequest: (data: FormData) =>
    api.post('/timeoff/requests/', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  reviewRequest: (id: string, action: 'approve' | 'reject') =>
    api.put(`/timeoff/requests/${id}/`, { action }),
  calendar: (year: number) =>
    api.get('/timeoff/calendar/', { params: { year } }),
  holidays: (year: number) =>
    api.get('/timeoff/holidays/', { params: { year } }),
};

// ─── Payroll ───────────────────────────────────────────────────────────────
export const payrollApi = {
  getSalary: (employeeId: string) =>
    api.get(`/payroll/${employeeId}/salary/`),
  updateSalary: (employeeId: string, data: object) =>
    api.put(`/payroll/${employeeId}/salary/`, data),
  getPayable: (employeeId: string, year: number, month: number) =>
    api.get(`/payroll/${employeeId}/payable/`, { params: { year, month } }),
};
