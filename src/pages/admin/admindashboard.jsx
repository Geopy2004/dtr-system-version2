import { FaUsers, FaClock, FaCalendarCheck, FaUserShield } from "react-icons/fa";
import "./admindashboard.css";
function AdminDashboard() {
  const stats = [
    {
      title: "Total Users",
      value: 120,
      icon: <FaUsers />,
      color: "#2563eb",
    },
    {
      title: "Present Today",
      value: 98,
      icon: <FaCalendarCheck />,
      color: "#16a34a",
    },
    {
      title: "Late Employees",
      value: 7,
      icon: <FaClock />,
      color: "#f59e0b",
    },
    {
      title: "Admins",
      value: 3,
      icon: <FaUserShield />,
      color: "#dc2626",
    },
  ];

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <p>Manage users and monitor attendance records.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div className="card" key={index}>
            <div
              className="icon-box"
              style={{ backgroundColor: stat.color }}
            >
              {stat.icon}
            </div>

            <div>
              <h3>{stat.value}</h3>
              <p>{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Logs */}
      <div className="table-container">
        <h2>Recent Attendance Logs</h2>

        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Date</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>Juan Dela Cruz</td>
              <td>May 8, 2026</td>
              <td>8:00 AM</td>
              <td>5:00 PM</td>
              <td className="present">Present</td>
            </tr>

            <tr>
              <td>Maria Santos</td>
              <td>May 8, 2026</td>
              <td>8:20 AM</td>
              <td>5:00 PM</td>
              <td className="late">Late</td>
            </tr>

            <tr>
              <td>Pedro Reyes</td>
              <td>May 8, 2026</td>
              <td>—</td>
              <td>—</td>
              <td className="absent">Absent</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboard;