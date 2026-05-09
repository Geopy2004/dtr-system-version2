import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

import TimeInOut from "../../components/users/timeinout";
import { attendanceAPI } from "../../services/api";

export default function UserDashboard() {
  const [stats, setStats] = useState({
    total_days: 0,
    present: 0,
    late: 0,
    total_late_minutes: 0,
  });

  const [recentAttendance, setRecentAttendance] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const startDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

        const [statsResult, recentResult] = await Promise.all([
          attendanceAPI.getMyAttendance({ startDate, endDate }),
          attendanceAPI.getMyAttendance({ limit: 5 }),
        ]);

        setStats(
          statsResult?.stats || {
            total_days: 0,
            present: 0,
            late: 0,
            total_late_minutes: 0,
          }
        );

        setRecentAttendance(recentResult?.attendance || []);
      } catch (error) {
        console.error('Dashboard error:', error);
      }
    };

    loadDashboard();
  }, []);

  return (
    <div className="user-dashboard">
      <h1>Welcome to Your Dashboard</h1>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Days</h3>
          <p>{stats.total_days}</p>
        </div>

        <div className="stat-card">
          <h3>Present</h3>
          <p>{stats.present}</p>
        </div>

        <div className="stat-card">
          <h3>Late</h3>
          <p>{stats.late}</p>
        </div>

        <div className="stat-card">
          <h3>Late Minutes</h3>
          <p>{stats.total_late_minutes}</p>
        </div>
      </div>

      <TimeInOut />

      <div className="recent-attendance">
        <h3>Recent Attendance</h3>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {recentAttendance.map((record) => (
              <tr key={record.id}>
                <td>{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                <td>{format(new Date(record.time_in), 'hh:mm a')}</td>
                <td>
                  {record.time_out
                    ? format(new Date(record.time_out), 'hh:mm a')
                    : '-'}
                </td>
                <td>{record.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}