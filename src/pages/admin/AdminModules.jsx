import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiArchive,
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiClock,
  FiDownload,
  FiEdit3,
  FiFilter,
  FiLock,
  FiPlus,
  FiPrinter,
  FiSave,
  FiSearch,
  FiSettings,
  FiShield,
  FiUpload,
  FiUsers,
  FiX,
} from "react-icons/fi";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { endOfMonth, format, startOfMonth } from "date-fns";
import AppShell from "../../components/common/AppShell";
import {
  adminAPI,
  attendanceAPI,
  departmentAPI,
  exportRowsToCsv,
  leaveAPI,
  logAPI,
  profileAPI,
  realtimeAPI,
  shiftAPI,
} from "../../services/api";
import {
  seedAttendance,
  seedDepartments,
  seedEmployees,
  seedHolidays,
  seedLeaves,
  seedLogs,
  seedShifts,
} from "../../data/platformSeed";
import {
  buildDashboardStats,
  buildMonthlyChart,
  formatDate,
  formatTime,
  getRecordEnd,
  getRecordHours,
  getRecordStart,
  getStatusLabel,
} from "../../utils/attendance";

const emptyEmployee = {
  full_name: "",
  email: "",
  department: "",
  position: "",
  role: "employee",
  is_active: true,
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((entry) => (
        <span key={entry.dataKey}>{entry.name || entry.dataKey}: {entry.value}</span>
      ))}
    </div>
  );
};

export function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyEmployee);
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const [users, depts] = await Promise.all([
        profileAPI.getAllUsers(),
        departmentAPI.getDepartments(),
      ]);
      setEmployees(users);
      setDepartments(depts);
    } catch (error) {
      console.warn("Employee preview data loaded:", error?.message);
      setEmployees(seedEmployees);
      setDepartments(seedDepartments);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(loadEmployees, 0);
    return () => window.clearTimeout(handle);
  }, [loadEmployees]);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees.filter((employee) => {
      const active = employee.is_active !== false;
      const matchesStatus =
        status === "all" || (status === "active" ? active : !active);
      const text = `${employee.full_name || employee.name || ""} ${employee.email || ""} ${employee.department || ""}`.toLowerCase();
      return matchesStatus && (!term || text.includes(term));
    });
  }, [employees, search, status]);

  const openEditor = (employee = null) => {
    setEditing(employee);
    setAvatarFile(null);
    setForm(employee ? { ...emptyEmployee, ...employee } : emptyEmployee);
  };

  const set = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const saveEmployee = async (event) => {
    event.preventDefault();
    if (!form.full_name || !form.email) {
      toast.error("Name and email are required.");
      return;
    }

    try {
      if (editing?.id) {
        const updates = { ...form };
        if (avatarFile) {
          updates.avatar_url = await profileAPI.uploadAvatar(avatarFile, editing.id);
        }
        await adminAPI.updateUser(editing.id, updates);
        toast.success("Employee updated.");
      } else {
        await adminAPI.createEmployee(form);
        toast.success("Employee invitation sent.");
      }
      setEditing(null);
      setForm(emptyEmployee);
      await loadEmployees();
    } catch (error) {
      toast.error(error?.message || "Unable to save employee.");
    }
  };

  const toggleActive = async (employee) => {
    try {
      await adminAPI.archiveUser(employee.id, employee.is_active === false);
      toast.success("Employee status updated.");
      await loadEmployees();
    } catch (error) {
      toast.error(error?.message || "Unable to update status.");
    }
  };

  const resetPassword = async (employee) => {
    try {
      await adminAPI.sendPasswordReset(employee.email);
      toast.success("Password reset email sent.");
    } catch (error) {
      toast.error(error?.message || "Unable to send reset email.");
    }
  };

  return (
    <AppShell>
      <div className="page page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">People Operations</span>
            <h1 className="page-title">Employees</h1>
            <p className="page-subtitle">{filteredEmployees.length} employee records</p>
          </div>
          <button className="primary-btn" type="button" onClick={() => openEditor()}>
            <FiPlus />
            Add Employee
          </button>
        </header>

        <section className="toolbar-card">
          <div className="toolbar-search">
            <FiSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees" />
          </div>
          <label className="select-control">
            <FiFilter />
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All Employees</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </section>

        <section className="table-card">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="person-cell">
                        <span>{(employee.full_name || employee.name || "E").slice(0, 1).toUpperCase()}</span>
                        <div>
                          <strong>{employee.full_name || employee.name || "Employee"}</strong>
                          <small>{employee.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{employee.department || employee.departments?.name || "Unassigned"}</td>
                    <td>{employee.position || "-"}</td>
                    <td><span className={`badge ${employee.role}`}>{employee.role || "employee"}</span></td>
                    <td><span className={`badge ${employee.is_active === false ? "inactive" : "active"}`}>{employee.is_active === false ? "Inactive" : "Active"}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" type="button" onClick={() => openEditor(employee)} aria-label="Edit employee"><FiEdit3 /></button>
                        <button className="icon-btn" type="button" onClick={() => resetPassword(employee)} aria-label="Reset password"><FiLock /></button>
                        <button className="icon-btn" type="button" onClick={() => toggleActive(employee)} aria-label="Archive employee"><FiArchive /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredEmployees.length && (
                  <tr>
                    <td colSpan="6" className="empty-cell">{loading ? "Loading employees..." : "No employees found."}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {editing !== null && (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <form className="modal-card form-grid" onSubmit={saveEmployee} onClick={(event) => event.stopPropagation()}>
            <div className="card-title-row">
              <h2>{editing?.id ? "Edit Employee" : "Add Employee"}</h2>
              <button className="icon-btn" type="button" onClick={() => setEditing(null)} aria-label="Close"><FiX /></button>
            </div>
            <label className="field-control">
              <span>Full name</span>
              <input value={form.full_name || ""} onChange={set("full_name")} />
            </label>
            <label className="field-control">
              <span>Email</span>
              <input type="email" value={form.email || ""} onChange={set("email")} disabled={Boolean(editing?.id)} />
            </label>
            <div className="form-two">
              <label className="field-control">
                <span>Department</span>
                <select value={form.department || ""} onChange={set("department")}>
                  <option value="">Unassigned</option>
                  {departments.map((department) => (
                    <option key={department.id || department.name} value={department.name}>{department.name}</option>
                  ))}
                </select>
              </label>
              <label className="field-control">
                <span>Role</span>
                <select value={form.role || "employee"} onChange={set("role")}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </div>
            <label className="field-control">
              <span>Position</span>
              <input value={form.position || ""} onChange={set("position")} />
            </label>
            {editing?.id && (
              <label className="upload-control">
                <FiUpload />
                <span>{avatarFile ? avatarFile.name : "Profile image"}</span>
                <input type="file" accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] || null)} />
              </label>
            )}
            <button className="primary-btn" type="submit">
              <FiSave />
              Save
            </button>
          </form>
        </div>
      )}
    </AppShell>
  );
}

export function AdminAttendance() {
  const [records, setRecords] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      setRecords(await attendanceAPI.getAllRecords(dateRange.start, dateRange.end));
    } catch (error) {
      console.warn("Attendance monitor preview data loaded:", error?.message);
      setRecords(seedAttendance);
    } finally {
      setLoading(false);
    }
  }, [dateRange.end, dateRange.start]);

  useEffect(() => {
    const handle = window.setTimeout(loadAttendance, 0);
    return () => window.clearTimeout(handle);
  }, [loadAttendance]);

  useEffect(() => realtimeAPI.subscribeToAttendance(loadAttendance), [loadAttendance]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
      const employee = record.profiles?.full_name || record.profiles?.name || "";
      const department = record.profiles?.department || "";
      const text = `${employee} ${department} ${record.status || ""}`.toLowerCase();
      return (status === "all" || record.status === status) && (!term || text.includes(term));
    });
  }, [records, search, status]);

  const stats = useMemo(() => buildDashboardStats(filteredRecords), [filteredRecords]);

  const exportAttendance = () => {
    exportRowsToCsv("admin-attendance.csv", filteredRecords, [
      { label: "Employee", value: (row) => row.profiles?.full_name || row.user_id },
      { label: "Department", value: (row) => row.profiles?.department || "-" },
      { label: "Date", value: (row) => formatDate(row.date, "yyyy-MM-dd") },
      { label: "Time In", value: (row) => formatTime(getRecordStart(row)) },
      { label: "Time Out", value: (row) => formatTime(getRecordEnd(row)) },
      { label: "Hours", value: (row) => getRecordHours(row).toFixed(2) },
      { label: "Status", value: "status" },
    ]);
  };

  return (
    <AppShell>
      <div className="page page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">Attendance Monitor</span>
            <h1 className="page-title">Daily Records</h1>
            <p className="page-subtitle">{stats.present} present, {stats.late} late, {stats.absent} absent</p>
          </div>
          <div className="header-actions">
            <button className="ghost-btn" type="button" onClick={exportAttendance} disabled={!filteredRecords.length}><FiDownload /> Export</button>
            <button className="ghost-btn" type="button" onClick={() => window.print()}><FiPrinter /> Print</button>
          </div>
        </header>

        <section className="toolbar-card">
          <label className="field-inline"><span>From</span><input type="date" value={dateRange.start} onChange={(event) => setDateRange((prev) => ({ ...prev, start: event.target.value }))} /></label>
          <label className="field-inline"><span>To</span><input type="date" value={dateRange.end} onChange={(event) => setDateRange((prev) => ({ ...prev, end: event.target.value }))} /></label>
          <div className="toolbar-search"><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee or department" /></div>
          <label className="select-control"><FiFilter /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All Status</option><option value="present">Present</option><option value="late">Late</option><option value="absent">Absent</option><option value="undertime">Undertime</option><option value="overtime">Overtime</option></select></label>
        </section>

        <section className="table-card">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Break</th>
                  <th>Time Out</th>
                  <th>Hours</th>
                  <th>Late</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.profiles?.full_name || record.profiles?.name || "Employee"}</td>
                    <td>{formatDate(record.date)}</td>
                    <td>{formatTime(getRecordStart(record))}</td>
                    <td>{formatTime(record.lunch_time_out)} / {formatTime(record.lunch_time_in)}</td>
                    <td>{formatTime(getRecordEnd(record))}</td>
                    <td>{getRecordHours(record).toFixed(2)}h</td>
                    <td>{record.late_minutes || 0}m</td>
                    <td><span className={`badge ${record.status}`}>{getStatusLabel(record.status)}</span></td>
                  </tr>
                ))}
                {!filteredRecords.length && (
                  <tr><td colSpan="8" className="empty-cell">{loading ? "Loading attendance..." : "No records found."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export function DepartmentManagement() {
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ name: "", code: "", is_active: true });
  const [editing, setEditing] = useState(null);

  const loadDepartments = useCallback(async () => {
    try {
      setDepartments(await departmentAPI.getDepartments());
    } catch (error) {
      console.warn("Department preview data loaded:", error?.message);
      setDepartments(seedDepartments);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(loadDepartments, 0);
    return () => window.clearTimeout(handle);
  }, [loadDepartments]);

  const saveDepartment = async (event) => {
    event.preventDefault();
    try {
      await departmentAPI.saveDepartment({ ...form, id: editing?.id });
      toast.success("Department saved.");
      setForm({ name: "", code: "", is_active: true });
      setEditing(null);
      await loadDepartments();
    } catch (error) {
      toast.error(error?.message || "Unable to save department.");
    }
  };

  const editDepartment = (department) => {
    setEditing(department);
    setForm({ name: department.name || "", code: department.code || "", is_active: department.is_active !== false });
  };

  return (
    <AppShell>
      <div className="page page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">Organization</span>
            <h1 className="page-title">Departments</h1>
            <p className="page-subtitle">{departments.length} departments</p>
          </div>
        </header>

        <section className="split-grid">
          <form className="glass-card form-grid" onSubmit={saveDepartment}>
            <div className="card-title-row"><h2>{editing ? "Edit Department" : "New Department"}</h2><FiBriefcase /></div>
            <label className="field-control"><span>Name</span><input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} /></label>
            <label className="field-control"><span>Code</span><input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))} /></label>
            <button className="primary-btn" type="submit"><FiSave /> Save</button>
          </form>

          <div className="table-card">
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Code</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {departments.map((department) => (
                    <tr key={department.id || department.name}>
                      <td>{department.name}</td>
                      <td>{department.code}</td>
                      <td><span className={`badge ${department.is_active === false ? "inactive" : "active"}`}>{department.is_active === false ? "Inactive" : "Active"}</span></td>
                      <td><button className="icon-btn" type="button" onClick={() => editDepartment(department)} aria-label="Edit department"><FiEdit3 /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export function ScheduleManagement() {
  const [shifts, setShifts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [shiftForm, setShiftForm] = useState({
    name: "",
    start_time: "08:00",
    end_time: "17:00",
    break_minutes: 60,
    grace_period_minutes: 15,
  });

  const loadSchedules = useCallback(async () => {
    try {
      const [shiftData, scheduleData] = await Promise.all([
        shiftAPI.getShifts(),
        shiftAPI.getSchedules(),
      ]);
      setShifts(shiftData);
      setSchedules(scheduleData);
    } catch (error) {
      console.warn("Schedule preview data loaded:", error?.message);
      setShifts(seedShifts);
      setSchedules([]);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(loadSchedules, 0);
    return () => window.clearTimeout(handle);
  }, [loadSchedules]);

  const saveShift = async (event) => {
    event.preventDefault();
    try {
      await shiftAPI.saveShift(shiftForm);
      toast.success("Shift saved.");
      setShiftForm({ name: "", start_time: "08:00", end_time: "17:00", break_minutes: 60, grace_period_minutes: 15 });
      await loadSchedules();
    } catch (error) {
      toast.error(error?.message || "Unable to save shift.");
    }
  };

  return (
    <AppShell>
      <div className="page page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">Scheduling</span>
            <h1 className="page-title">Shifts</h1>
            <p className="page-subtitle">{shifts.length} shift templates</p>
          </div>
        </header>

        <section className="split-grid">
          <form className="glass-card form-grid" onSubmit={saveShift}>
            <div className="card-title-row"><h2>Shift Template</h2><FiCalendar /></div>
            <label className="field-control"><span>Name</span><input value={shiftForm.name} onChange={(event) => setShiftForm((prev) => ({ ...prev, name: event.target.value }))} /></label>
            <div className="form-two">
              <label className="field-control"><span>Start</span><input type="time" value={shiftForm.start_time} onChange={(event) => setShiftForm((prev) => ({ ...prev, start_time: event.target.value }))} /></label>
              <label className="field-control"><span>End</span><input type="time" value={shiftForm.end_time} onChange={(event) => setShiftForm((prev) => ({ ...prev, end_time: event.target.value }))} /></label>
            </div>
            <div className="form-two">
              <label className="field-control"><span>Break minutes</span><input type="number" value={shiftForm.break_minutes} onChange={(event) => setShiftForm((prev) => ({ ...prev, break_minutes: event.target.value }))} /></label>
              <label className="field-control"><span>Grace minutes</span><input type="number" value={shiftForm.grace_period_minutes} onChange={(event) => setShiftForm((prev) => ({ ...prev, grace_period_minutes: event.target.value }))} /></label>
            </div>
            <button className="primary-btn" type="submit"><FiSave /> Save</button>
          </form>

          <div className="table-card">
            <div className="card-title-row"><h2>Schedule Board</h2><span className="pill">{schedules.length} assignments</span></div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>Shift</th><th>Start</th><th>End</th><th>Break</th><th>Grace</th></tr></thead>
                <tbody>
                  {shifts.map((shift) => (
                    <tr key={shift.id || shift.name}>
                      <td>{shift.name}</td>
                      <td>{shift.start_time}</td>
                      <td>{shift.end_time}</td>
                      <td>{shift.break_minutes}m</td>
                      <td>{shift.grace_period_minutes}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export function AdminLeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [reviewNote, setReviewNote] = useState("");

  const loadLeaves = useCallback(async () => {
    try {
      setLeaves(await leaveAPI.getAllLeaves());
    } catch (error) {
      console.warn("Leave approval preview data loaded:", error?.message);
      setLeaves(seedLeaves);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(loadLeaves, 0);
    return () => window.clearTimeout(handle);
  }, [loadLeaves]);

  useEffect(() => realtimeAPI.subscribeToTable("leave_requests", loadLeaves), [loadLeaves]);

  const reviewLeave = async (leave, status) => {
    try {
      await leaveAPI.reviewLeave(leave.id, status, reviewNote);
      toast.success(`Leave ${status}.`);
      setReviewNote("");
      await loadLeaves();
    } catch (error) {
      toast.error(error?.message || "Unable to review leave.");
    }
  };

  return (
    <AppShell>
      <div className="page page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">Leave Desk</span>
            <h1 className="page-title">Leave Management</h1>
            <p className="page-subtitle">{leaves.filter((leave) => leave.status === "pending").length} pending requests</p>
          </div>
        </header>

        <section className="table-card">
          <div className="toolbar-card"><input className="input" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder="Review note" /></div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th>Review</th></tr></thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave.id}>
                    <td>{leave.profiles?.full_name || "Employee"}</td>
                    <td>{leave.leave_type}</td>
                    <td>{formatDate(leave.start_date)} to {formatDate(leave.end_date)}</td>
                    <td>{leave.total_days}</td>
                    <td><span className={`badge ${leave.status}`}>{getStatusLabel(leave.status)}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" type="button" onClick={() => reviewLeave(leave, "approved")} disabled={leave.status !== "pending"} aria-label="Approve leave"><FiCheck /></button>
                        <button className="icon-btn" type="button" onClick={() => reviewLeave(leave, "rejected")} disabled={leave.status !== "pending"} aria-label="Reject leave"><FiX /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export function ReportsAnalytics() {
  const [records, setRecords] = useState([]);
  const [range, setRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  const loadReports = useCallback(async () => {
    try {
      setRecords(await attendanceAPI.getAllRecords(range.start, range.end));
    } catch (error) {
      console.warn("Report preview data loaded:", error?.message);
      setRecords(seedAttendance);
    }
  }, [range.end, range.start]);

  useEffect(() => {
    const handle = window.setTimeout(loadReports, 0);
    return () => window.clearTimeout(handle);
  }, [loadReports]);

  const stats = useMemo(() => buildDashboardStats(records), [records]);
  const chart = useMemo(() => buildMonthlyChart(records), [records]);

  const exportPayroll = () => {
    exportRowsToCsv("payroll-attendance-summary.csv", records, [
      { label: "Employee", value: (row) => row.profiles?.full_name || row.user_id },
      { label: "Department", value: (row) => row.profiles?.department || "-" },
      { label: "Date", value: (row) => formatDate(row.date, "yyyy-MM-dd") },
      { label: "Worked Hours", value: (row) => getRecordHours(row).toFixed(2) },
      { label: "Overtime Minutes", value: "overtime_minutes" },
      { label: "Undertime Minutes", value: "undertime_minutes" },
      { label: "Late Minutes", value: "late_minutes" },
      { label: "Status", value: "status" },
    ]);
  };

  return (
    <AppShell>
      <div className="page page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">Reports</span>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">{stats.totalWorkedHours} worked hours</p>
          </div>
          <div className="header-actions">
            <label className="field-inline"><span>From</span><input type="date" value={range.start} onChange={(event) => setRange((prev) => ({ ...prev, start: event.target.value }))} /></label>
            <label className="field-inline"><span>To</span><input type="date" value={range.end} onChange={(event) => setRange((prev) => ({ ...prev, end: event.target.value }))} /></label>
            <button className="primary-btn" type="button" onClick={exportPayroll}><FiDownload /> Excel CSV</button>
            <button className="ghost-btn" type="button" onClick={() => window.print()}><FiPrinter /> PDF Print</button>
          </div>
        </header>

        <section className="metric-grid">
          <article className="metric-card"><div className="metric-icon"><FiBarChart2 /></div><div className="metric-value">{stats.attendancePercentage}%</div><div className="metric-label">Attendance Rate</div></article>
          <article className="metric-card"><div className="metric-icon"><FiClock /></div><div className="metric-value">{stats.totalLateMinutes}m</div><div className="metric-label">Late Minutes</div></article>
          <article className="metric-card"><div className="metric-icon"><FiUsers /></div><div className="metric-value">{records.length}</div><div className="metric-label">DTR Rows</div></article>
          <article className="metric-card"><div className="metric-icon"><FiShield /></div><div className="metric-value">{stats.absent}</div><div className="metric-label">Absences</div></article>
        </section>

        <section className="chart-card">
          <div className="card-title-row"><h2>Monthly DTR Summary</h2><span className="pill">{range.start} to {range.end}</span></div>
          <div className="chart-height">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="week" stroke="#8fa2cb" tickLine={false} axisLine={false} />
                <YAxis stroke="#8fa2cb" tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line dataKey="present" stroke="#22c55e" strokeWidth={3} />
                <Line dataKey="late" stroke="#f59e0b" strokeWidth={3} />
                <Line dataKey="absent" stroke="#f43f5e" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export function AuditTrail() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");

  const loadLogs = useCallback(async () => {
    try {
      setLogs(await logAPI.getAuditTrail());
    } catch (error) {
      console.warn("Audit preview data loaded:", error?.message);
      setLogs(seedLogs);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(loadLogs, 0);
    return () => window.clearTimeout(handle);
  }, [loadLogs]);

  useEffect(() => realtimeAPI.subscribeToTable("activity_logs", loadLogs), [loadLogs]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((log) => `${log.action || ""} ${log.description || ""}`.toLowerCase().includes(term));
  }, [logs, search]);

  return (
    <AppShell>
      <div className="page page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">Audit Trail</span>
            <h1 className="page-title">System Logs</h1>
            <p className="page-subtitle">{filteredLogs.length} events</p>
          </div>
        </header>
        <section className="toolbar-card"><div className="toolbar-search"><FiSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search audit events" /></div></section>
        <section className="table-card">
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Actor</th><th>Action</th><th>Status</th><th>Date</th><th>Device</th><th>Details</th></tr></thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.actor?.full_name || log.actor_id || "System"}</td>
                    <td>{(log.action || "activity").replaceAll(".", " ")}</td>
                    <td><span className={`badge ${log.status || "success"}`}>{getStatusLabel(log.status || "success")}</span></td>
                    <td>{formatDate(log.created_at || log.timestamp, "MMM dd, yyyy hh:mm a")}</td>
                    <td>{log.device || "Browser"}</td>
                    <td>{log.description || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export function SystemSettings() {
  const [holidays, setHolidays] = useState([]);
  const [holiday, setHoliday] = useState({ name: "", date: "", type: "Regular" });

  const loadHolidays = useCallback(async () => {
    try {
      setHolidays(await adminAPI.getHolidays());
    } catch (error) {
      console.warn("Settings preview data loaded:", error?.message);
      setHolidays(seedHolidays);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(loadHolidays, 0);
    return () => window.clearTimeout(handle);
  }, [loadHolidays]);

  const saveHoliday = async (event) => {
    event.preventDefault();
    try {
      await adminAPI.saveHoliday(holiday);
      toast.success("Holiday saved.");
      setHoliday({ name: "", date: "", type: "Regular" });
      await loadHolidays();
    } catch (error) {
      toast.error(error?.message || "Unable to save holiday.");
    }
  };

  return (
    <AppShell>
      <div className="page page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">System</span>
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">{holidays.length} holidays</p>
          </div>
        </header>
        <section className="split-grid">
          <form className="glass-card form-grid" onSubmit={saveHoliday}>
            <div className="card-title-row"><h2>Holiday</h2><FiSettings /></div>
            <label className="field-control"><span>Name</span><input value={holiday.name} onChange={(event) => setHoliday((prev) => ({ ...prev, name: event.target.value }))} /></label>
            <label className="field-control"><span>Date</span><input type="date" value={holiday.date} onChange={(event) => setHoliday((prev) => ({ ...prev, date: event.target.value }))} /></label>
            <label className="field-control"><span>Type</span><select value={holiday.type} onChange={(event) => setHoliday((prev) => ({ ...prev, type: event.target.value }))}><option>Regular</option><option>Special</option><option>Company</option></select></label>
            <button className="primary-btn" type="submit"><FiSave /> Save</button>
          </form>
          <div className="table-card">
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Date</th><th>Type</th></tr></thead>
                <tbody>
                  {holidays.map((item) => (
                    <tr key={item.id || item.name}>
                      <td>{item.name}</td>
                      <td>{formatDate(item.date)}</td>
                      <td>{item.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
