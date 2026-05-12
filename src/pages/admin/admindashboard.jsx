import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import AttendanceTable from "./attendancetable";
import { attendanceAPI, profileAPI } from "../../services/api";
import "./admindashboard.css";

const AdminDashboard = () => {
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  // ✅ FIX: no separate fetchData function
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        const [recs, usrs] = await Promise.all([
          attendanceAPI.getAllRecords(dateRange.start, dateRange.end),
          profileAPI.getAllUsers(),
        ]);

        setRecords(recs || []);
        setUsers(usrs || []);
      } catch (err) {
        console.error("Error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateRange.start, dateRange.end]);

  const totalHours = records.reduce(
    (sum, r) => sum + parseFloat(r.hours_worked || 0),
    0
  );

  const completeRecords = records.filter(
    (r) => r.time_in && r.time_out
  ).length;

  // ❌ FIX: remove unused variable warning
  // const incompleteRecords = records.filter((r) => r.time_in && !r.time_out).length;

  const stats = [
    { label: "Total Employees", value: users.length, icon: "👥", color: "blue" },
    { label: "Total Records", value: records.length, icon: "📋", color: "indigo" },
    { label: "Complete Shifts", value: completeRecords, icon: "✅", color: "green" },
    { label: "Total Hours", value: `${totalHours.toFixed(1)}h`, icon: "⏱", color: "purple" },
  ];

  return (
    <div className="admin-dash">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">
            Monitor employee attendance and time records
          </p>
        </div>

        <div className="date-filters">
          <div className="filter-group">
            <label>From</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
            />
          </div>

          <div className="filter-group">
            <label>To</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
            />
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {stats.map(({ label, value, icon, color }) => (
          <div key={label} className={`stat-card color-${color}`}>
            <div className="stat-icon">{icon}</div>
            <div className="stat-info">
              <span className="stat-value">{value}</span>
              <span className="stat-label">{label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Attendance Records</h2>
          <span>{records.length} records</span>
        </div>

        <AttendanceTable records={records} loading={loading} />
      </div>
    </div>
  );
};

export default AdminDashboard;