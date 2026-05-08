import { FaClock, FaCalendarCheck, FaHistory, FaUser } from "react-icons/fa";

function UserDashboard() {
  const attendance = [
    {
      date: "May 8, 2026",
      timeIn: "8:00 AM",
      timeOut: "5:00 PM",
      status: "Present",
    },
    {
      date: "May 7, 2026",
      timeIn: "8:15 AM",
      timeOut: "5:00 PM",
      status: "Late",
    },
    {
      date: "May 6, 2026",
      timeIn: "8:00 AM",
      timeOut: "5:00 PM",
      status: "Present",
    },
  ];

  return (
    <div className="user-dashboard">
      {/* Header */}
      <div className="user-header">
        <h1>Welcome Back 👋</h1>
        <p>Track your attendance and work records.</p>
      </div>

      {/* Cards */}
      <div className="user-cards">
        <div className="user-card">
          <div className="card-icon blue">
            <FaCalendarCheck />
          </div>

          <div>
            <h3>22</h3>
            <p>Days Present</p>
          </div>
        </div>

        <div className="user-card">
          <div className="card-icon orange">
            <FaClock />
          </div>

          <div>
            <h3>3</h3>
            <p>Late Records</p>
          </div>
        </div>

        <div className="user-card">
          <div className="card-icon green">
            <FaHistory />
          </div>

          <div>
            <h3>168 hrs</h3>
            <p>Total Hours</p>
          </div>
        </div>

        <div className="user-card">
          <div className="card-icon purple">
            <FaUser />
          </div>

          <div>
            <h3>Employee</h3>
            <p>Role</p>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="attendance-table">
        <h2>Recent Attendance</h2>

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
            {attendance.map((item, index) => (
              <tr key={index}>
                <td>{item.date}</td>
                <td>{item.timeIn}</td>
                <td>{item.timeOut}</td>

                <td
                  className={
                    item.status === "Present"
                      ? "present"
                      : "late"
                  }
                >
                  {item.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserDashboard;