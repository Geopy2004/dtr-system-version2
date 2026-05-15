const today = new Date();

const addDays = (offset) => {
  const date = new Date(today);
  date.setDate(today.getDate() + offset);
  return date;
};

const isoDate = (date) => date.toISOString().split("T")[0];

const at = (date, hour, minute = 0) => {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next.toISOString();
};

export const seedEmployees = [
  {
    id: "seed-1",
    full_name: "Mara Santos",
    email: "mara.santos@company.com",
    department: "Engineering",
    position: "Frontend Engineer",
    role: "employee",
    is_active: true,
  },
  {
    id: "seed-2",
    full_name: "Ilya Reyes",
    email: "ilya.reyes@company.com",
    department: "Operations",
    position: "Ops Analyst",
    role: "employee",
    is_active: true,
  },
  {
    id: "seed-3",
    full_name: "Nina Cruz",
    email: "nina.cruz@company.com",
    department: "Human Resources",
    position: "HR Manager",
    role: "admin",
    is_active: true,
  },
  {
    id: "seed-4",
    full_name: "Kenji Lim",
    email: "kenji.lim@company.com",
    department: "Finance",
    position: "Payroll Specialist",
    role: "employee",
    is_active: false,
  },
];

export const seedUserAccounts = [
  {
    id: "seed-1",
    email: "mara.santos@company.com",
    password: "Password123!",
    role: "employee",
  },
  {
    id: "seed-2",
    email: "ilya.reyes@company.com",
    password: "Password123!",
    role: "employee",
  },
  {
    id: "seed-3",
    email: "nina.cruz@company.com",
    password: "Admin123!",
    role: "admin",
  },
  {
    id: "seed-4",
    email: "kenji.lim@company.com",
    password: "Password123!",
    role: "employee",
  },
];

export const seedDepartments = [
  { id: "dept-1", name: "Engineering", code: "ENG", is_active: true },
  { id: "dept-2", name: "Operations", code: "OPS", is_active: true },
  { id: "dept-3", name: "Human Resources", code: "HR", is_active: true },
  { id: "dept-4", name: "Finance", code: "FIN", is_active: true },
];

export const seedShifts = [
  {
    id: "shift-1",
    name: "Core Day",
    start_time: "08:00",
    end_time: "17:00",
    break_minutes: 60,
    grace_period_minutes: 15,
  },
  {
    id: "shift-2",
    name: "Flex Morning",
    start_time: "07:00",
    end_time: "16:00",
    break_minutes: 60,
    grace_period_minutes: 10,
  },
  {
    id: "shift-3",
    name: "Support Swing",
    start_time: "13:00",
    end_time: "22:00",
    break_minutes: 60,
    grace_period_minutes: 15,
  },
];

export const seedSchedules = [
  {
    id: "schedule-1",
    user_id: "seed-1",
    department_id: null,
    shift_id: "shift-1",
    valid_from: isoDate(addDays(-14)),
    valid_to: "",
    days_of_week: [1, 2, 3, 4, 5],
    is_active: true,
    profiles: seedEmployees[0],
    departments: null,
    shifts: seedShifts[0],
  },
  {
    id: "schedule-2",
    user_id: null,
    department_id: "dept-2",
    shift_id: "shift-3",
    valid_from: isoDate(addDays(1)),
    valid_to: "",
    days_of_week: [1, 2, 3, 4, 5],
    is_active: true,
    profiles: null,
    departments: seedDepartments[1],
    shifts: seedShifts[2],
  },
];

export const seedAttendance = Array.from({ length: 18 }, (_, index) => {
  const date = addDays(-index);
  const late = index % 5 === 0;
  const absent = index % 11 === 0;
  const outHour = index % 4 === 0 ? 18 : 17;
  return {
    id: `att-${index}`,
    user_id: "seed-user",
    date: isoDate(date),
    time_in: absent ? null : at(date, late ? 8 : 7, late ? 37 : 56),
    morning_time_in: absent ? null : at(date, late ? 8 : 7, late ? 37 : 56),
    lunch_time_out: absent ? null : at(date, 12),
    lunch_time_in: absent ? null : at(date, 13),
    time_out: absent ? null : at(date, outHour, index % 3 === 0 ? 24 : 5),
    afternoon_time_out: absent ? null : at(date, outHour, index % 3 === 0 ? 24 : 5),
    status: absent ? "absent" : late ? "late" : outHour > 17 ? "overtime" : "present",
    late_minutes: late ? 22 : 0,
    hours_worked: absent ? 0 : outHour > 17 ? 8.4 : 8.05,
    overtime_minutes: outHour > 17 ? 24 : 0,
    undertime_minutes: 0,
    notes: index % 6 === 0 ? "Field work validated by supervisor" : "",
    profiles: seedEmployees[index % seedEmployees.length],
  };
});

export const seedLeaves = [
  {
    id: "leave-1",
    leave_type: "Vacation",
    start_date: isoDate(addDays(8)),
    end_date: isoDate(addDays(9)),
    total_days: 2,
    reason: "Family event",
    status: "pending",
    profiles: seedEmployees[0],
  },
  {
    id: "leave-2",
    leave_type: "Sick",
    start_date: isoDate(addDays(-6)),
    end_date: isoDate(addDays(-6)),
    total_days: 1,
    reason: "Medical appointment",
    status: "approved",
    profiles: seedEmployees[1],
  },
];

export const seedLogs = [
  {
    id: "log-1",
    action: "attendance.time_in",
    description: "Recorded morning time in",
    status: "success",
    timestamp: at(addDays(0), 7, 58),
    device: "Windows",
  },
  {
    id: "log-2",
    action: "attendance.break_out",
    description: "Recorded break out",
    status: "success",
    timestamp: at(addDays(0), 12, 0),
    device: "Chrome",
  },
  {
    id: "log-3",
    action: "leave.submit",
    description: "Submitted vacation leave request",
    status: "pending",
    timestamp: at(addDays(-1), 16, 22),
    device: "Windows",
  },
  {
    id: "log-4",
    action: "login",
    description: "Signed in to One Punch-In",
    status: "success",
    timestamp: at(addDays(-2), 8, 2),
    device: "iOS",
  },
];

export const seedHolidays = [
  { id: "holiday-1", name: "Company Planning Day", date: isoDate(addDays(18)), type: "Company" },
  { id: "holiday-2", name: "National Holiday", date: isoDate(addDays(34)), type: "Regular" },
];
