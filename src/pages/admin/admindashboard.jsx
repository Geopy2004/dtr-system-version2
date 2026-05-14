import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiClock,
  FiDownload,
  FiShield,
  FiUsers,
} from "react-icons/fi";
import { endOfMonth, format, startOfMonth } from "date-fns";
import AppShell from "../../components/common/AppShell";
import {
  adminAPI,
  exportRowsToCsv,
  realtimeAPI,
} from "../../services/api";
import {
  seedAttendance,
  seedDepartments,
  seedEmployees,
  seedLeaves,
} from "../../data/platformSeed";
import {
  formatDate,
  formatTime,
  getRecordEnd,
  getRecordStart,
  getStatusLabel,
} from "../../utils/attendance";

const palette = ["#22c55e", "#f59e0b", "#f43f5e", "#06b6d4", "#ec4899"];

const TooltipCard = ({ active, payload, label }) => {
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

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getDashboardStats(dateRange.start, dateRange.end);
      setRecords(data.attendance || []);
      setEmployees(data.users || []);
      setDepartments(data.departments || []);
      setLeaves(data.leaves || []);
    } catch (error) {
      console.warn("Admin preview data loaded:", error?.message);
      setRecords(seedAttendance);
      setEmployees(seedEmployees);
      setDepartments(seedDepartments);
      setLeaves(seedLeaves);
    } finally {
      setLoading(false);
    }
  }, [dateRange.end, dateRange.start]);

  useEffect(() => {
    const handle = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(handle);
  }, [loadData]);

  useEffect(() => {
    const unsubscribeAttendance = realtimeAPI.subscribeToAttendance(loadData);
    const unsubscribeLeave = realtimeAPI.subscribeToTable("leave_requests", loadData);
    return () => {
      unsubscribeAttendance();
      unsubscribeLeave();
    };
  }, [loadData]);

  const metrics = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const todayRecords = records.filter((record) => record.date === today);
    const present = todayRecords.filter((record) =>
      ["present", "late", "undertime", "overtime"].includes(record.status)
    ).length;
    const late = todayRecords.filter((record) => record.status === "late").length;
    return [
      { label: "Employees", value: employees.length, icon: <FiUsers />, trend: `${employees.filter((employee) => employee.is_active !== false).length} active` },
      { label: "Administrators", value: employees.filter((employee) => employee.role === "admin").length, icon: <FiShield />, trend: `${employees.filter((employee) => employee.role === "admin" && employee.is_active !== false).length} active` },
      { label: "Checked In", value: todayRecords.length, icon: <FiClock />, trend: `${present} present today` },
      { label: "Late Today", value: late, icon: <FiActivity />, trend: "Today" },
      { label: "Pending Leave", value: leaves.filter((leave) => leave.status === "pending").length, icon: <FiCalendar />, trend: `${departments.length} departments` },
    ];
  }, [departments.length, employees, leaves, records]);

  const departmentChart = useMemo(() => {
    const grouped = new Map();
    employees.forEach((employee) => {
      const name = employee.department || employee.departments?.name || "Unassigned";
      const current = grouped.get(name) || { department: name, employees: 0, attendance: 0 };
      current.employees += 1;
      current.attendance += records.filter(
        (record) => record.profiles?.department === name || record.user_id === employee.id
      ).length;
      grouped.set(name, current);
    });
    return Array.from(grouped.values()).slice(0, 8);
  }, [employees, records]);

  const statusChart = useMemo(() => {
    const grouped = new Map();
    records.forEach((record) => {
      const status = getStatusLabel(record.status);
      grouped.set(status, (grouped.get(status) || 0) + 1);
    });
    return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
  }, [records]);

  const exportSummary = () => {
    exportRowsToCsv("attendance-summary.csv", records, [
      { label: "Employee", value: (row) => row.profiles?.full_name || row.profiles?.name || row.user_id },
      { label: "Department", value: (row) => row.profiles?.department || "-" },
      { label: "Date", value: (row) => formatDate(row.date, "yyyy-MM-dd") },
      { label: "Time In", value: (row) => formatTime(getRecordStart(row)) },
      { label: "Time Out", value: (row) => formatTime(getRecordEnd(row)) },
      { label: "Hours", value: "hours_worked" },
      { label: "Late Minutes", value: "late_minutes" },
      { label: "Status", value: "status" },
    ]);
  };

  return (
    <AppShell>
      <div className="page page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">Admin Command Center</span>
            <h1 className="page-title">Attendance Control</h1>
            <p className="page-subtitle">{dateRange.start} to {dateRange.end}</p>
          </div>
          <div className="header-actions">
            <label className="field-inline">
              <span>From</span>
              <input type="date" value={dateRange.start} onChange={(event) => setDateRange((prev) => ({ ...prev, start: event.target.value }))} />
            </label>
            <label className="field-inline">
              <span>To</span>
              <input type="date" value={dateRange.end} onChange={(event) => setDateRange((prev) => ({ ...prev, end: event.target.value }))} />
            </label>
            <button className="primary-btn" type="button" onClick={exportSummary} disabled={!records.length}>
              <FiDownload />
              Export
            </button>
          </div>
        </header>

        <section className="metric-grid">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <div className="metric-icon">{metric.icon}</div>
              <div className="metric-value">{loading ? <span className="skeleton text-skeleton" /> : metric.value}</div>
              <div className="metric-label">{metric.label}</div>
              <div className="metric-trend">{metric.trend}</div>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <div className="chart-card">
            <div className="card-title-row">
              <div>
                <span className="eyebrow">Department Pulse</span>
                <h2>Coverage by department</h2>
              </div>
              <FiBarChart2 />
            </div>
            <div className="chart-height">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChart}>
                  <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                  <XAxis dataKey="department" stroke="#8fa2cb" tickLine={false} axisLine={false} />
                  <YAxis stroke="#8fa2cb" tickLine={false} axisLine={false} />
                  <Tooltip content={<TooltipCard />} />
                  <Bar dataKey="employees" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="attendance" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <div className="card-title-row">
              <div>
                <span className="eyebrow">Attendance Mix</span>
                <h2>Status distribution</h2>
              </div>
              <span className="pill">{records.length} records</span>
            </div>
            <div className="compact-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusChart} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={4}>
                    {statusChart.map((entry, index) => (
                      <Cell key={entry.name} fill={palette[index % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipCard />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="table-card">
          <div className="card-title-row">
            <div>
              <span className="eyebrow">Live Monitor</span>
              <h2>Latest attendance events</h2>
            </div>
            <Link className="ghost-btn" to="/admin/attendance">Open monitor</Link>
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 8).map((record) => (
                  <tr key={record.id}>
                    <td>{record.profiles?.full_name || record.profiles?.name || "Employee"}</td>
                    <td>{record.profiles?.department || "Unassigned"}</td>
                    <td>{formatDate(record.date)}</td>
                    <td>{formatTime(getRecordStart(record))}</td>
                    <td>{formatTime(getRecordEnd(record))}</td>
                    <td><span className={`badge ${record.status}`}>{getStatusLabel(record.status)}</span></td>
                  </tr>
                ))}
                {!records.length && (
                  <tr>
                    <td colSpan="6" className="empty-cell">{loading ? "Loading attendance..." : "No attendance records found."}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
