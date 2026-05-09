import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import "./admindashboard.css";
export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    active_users: 0,
    today_attendance: {
      total_checked_in: 0,
      present: 0,
      late: 0,
      half_day: 0,
    },
    today_logged_in: 0,
  });

  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // ======================
  // LOAD DASHBOARD DATA
  // ======================
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [statsResult, attendanceResult] = await Promise.all([
          adminAPI.getDashboardStats(),
          adminAPI.getAllAttendance({ limit: 10 }),
        ]);

        setStats(statsResult);
        setRecentAttendance(attendanceResult?.attendance || []);
      } catch (error) {
        console.error('Dashboard load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      {/* ================= STATS ================= */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-number">{stats.total_users}</p>
          <span className="stat-label">
            Active: {stats.active_users}
          </span>
        </div>

        <div className="stat-card">
          <h3>Today's Check-ins</h3>
          <p className="stat-number">
            {stats.today_attendance.total_checked_in}
          </p>
          <div className="stat-details">
            <span>Present: {stats.today_attendance.present}</span>
            <span>Late: {stats.today_attendance.late}</span>
            <span>Half Day: {stats.today_attendance.half_day}</span>
          </div>
        </div>

        <div className="stat-card">
          <h3>Today's Logins</h3>
          <p className="stat-number">
            {stats.today_logged_in}
          </p>
        </div>
      </div>

      {/* ================= RECENT ACTIVITY ================= */}
      <div className="recent-activity">
        <h3>Recent Attendance Activity</h3>

        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Date</th>
              <th>Time In</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {recentAttendance.map((record) => (
              <tr key={record.id}>
                <td>{record.profiles?.name}</td>
                <td>{record.profiles?.department}</td>
                <td>
                  {record.date
                    ? new Date(record.date).toLocaleDateString()
                    : '-'}
                </td>
                <td>
                  {record.time_in
                    ? new Date(record.time_in).toLocaleTimeString()
                    : '-'}
                </td>
                <td className={`status-${record.status}`}>
                  {record.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}