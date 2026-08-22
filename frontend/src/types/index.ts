export interface User {
  id: string;
  email: string;
  login_id: string;
  role: 'admin' | 'hr_officer' | 'employee';
  company_id: string | null;
  employee_id: string | null;
  is_first_login: boolean;
  employee?: {
    id: string;
    full_name: string;
    profile_image: string | null;
    department: string;
    job_position: string;
  };
}

export interface Company {
  id: string;
  name: string;
  logo: string | null;
}

export interface Employee {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  login_id: string;
  email: string;
  phone: string;
  department: string;
  job_position: string;
  manager: string;
  location: string;
  date_of_joining: string;
  joining_year: string;
  profile_image: string | null;
  company_id: string | null;
  user_id: string | null;
  employee_code: string;
  resume: Record<string, unknown>;
  about_job: string;
  interests: string[];
  hobbies: string[];
  skills: string[];
  certifications: Certification[];
  date_of_birth: string;
  address: string;
  nationality: string;
  personal_email: string;
  gender: string;
  marital_status: string;
  bank_account: string;
  bank_name: string;
  ifsc_code: string;
  pan_number: string;
  attendance_status: 'present' | 'on_leave' | 'absent';
  created_at: string | null;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface AttendanceRecord {
  id: string | null;
  employee_id: string;
  employee_name?: string;
  employee_image?: string | null;
  department?: string;
  employee_code?: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: string;
  extra_hours: string;
  break_minutes: number;
  status: string;
}

export interface TimeOffRequest {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_image?: string | null;
  leave_type: string;
  leave_type_label: string;
  start_date: string;
  end_date: string;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  attachment: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface TimeOffAllocation {
  id: string;
  employee_id: string;
  type: string;
  label: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
  year: string;
}

export interface SalaryInfo {
  id: string;
  employee_id: string;
  monthly_wage: number;
  yearly_wage: number;
  working_days_per_week: number;
  break_time_minutes: number;
  working_schedule: string;
  wage_type: string;
  component_percentages: Record<string, number>;
  components: {
    basic_salary: number;
    house_rent_allowance: number;
    standard_allowance: number;
    performance_bonus: number;
    leave_travel_allowance: number;
    fixed_allowance: number;
  };
  provident_fund: {
    employee_pf_percentage: number;
    employer_pf_percentage: number;
    employee_pf_amount: number;
    employer_pf_amount: number;
    professional_tax: number;
  };
}

export interface PublicHoliday {
  id: string;
  name: string;
  date: string;
}
