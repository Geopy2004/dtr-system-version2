import { useState, useEffect } from "react";
import { attendanceAPI } from "../../services/api";
import toast from "react-hot-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";
import TimeInOut from "./timeinout.jsx";
import "./myattendance.css";

/**
 * MyAttendance Component
 * 
 * Displays:
 * - TimeInOut widget for clocking in/out
 * - Monthly statistics (Total, Present, Late, Absent)
 * - Attendance history table with filtering by month
 * 
 * Updates automatically when user times in/out
 */
export default function MyAttendance() {
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // ─────────────────────────────
  // FETCH ATTENDANCE HISTORY
  // ─────────────────────────────
  useEffect(() => {
    const fetchAttendanceHistory = async () => {
      try {
        setLoading(true);

        const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
        const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

        const result = await attendanceAPI.getMyAttendance({
          startDate,
          endDate,
        });

        console.log("ATTENDANCE HISTORY:", result);

        // Handle different API response formats
        const attendance = Array.isArray(result?.attendance)
          ? result.attendance
          : Array.isArray(result?.data)
          ? result.data
          : [];

        setAttendanceList(attendance);
      } catch (error) {
        console.error("Fetch error:", error);
        toast.error("Failed to load attendance history");
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceHistory();
  }, [currentMonth]);

  // ─────────────────────────────
  // HANDLE ATTENDANCE UPDATE
  // ─────────────────────────────
  // Called when user times in or out
  const handleAttendanceUpdate = (attendance) => {
    if (attendance) {
      const today = format(new Date(), "yyyy-MM-dd");
      
      // Find and update today's record
      const existingIndex = attendanceList.findIndex(
        (record) =>
          format(new Date(record.date || record.created_at), "yyyy-MM-dd") ===
          today
      );

      if (existingIndex >= 0) {
        // Update existing record
        const updated = [...attendanceList];
        updated[existingIndex] = attendance;
        setAttendanceList(updated);
      } else {
        // Add new record if it doesn't exist
        setAttendanceList([attendance, ...attendanceList]);
      }
    }
  };

  // ─────────────────────────────
  // MONTH NAVIGATION
  // ─────────────────────────────
  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  // ─────────────────────────────
  // CALCULATE STATISTICS
  // ─────────────────────────────
  const stats = {
    total: attendanceList.length,
    present: attendanceList.filter(
      (record) => record.status === "present" || record.time_in
    ).length,
    absent: attendanceList.filter(
      (record) => record.status === "absent" || (!record.time_in && record.date)
    ).length,
    late: attendanceList.filter((record) => record.status === "late").length,
  };

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────
  return (
    <div className="myattendance-container">
      {/* HEADER */}
      <div className="attendance-header">
        <h2>My Attendance</h2>
        <p className="subtitle">Track your attendance and time records</p>
      </div>

      {/* TIME IN/OUT SECTION */}
      <section className="timeinout-section">
        <TimeInOut onAttendanceUpdate={handleAttendanceUpdate} />
      </section>

      {/* STATISTICS SECTION */}
      <section className="statistics-section">
        <h3>Monthly Statistics</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Days</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card present">
            <div className="stat-label">Present</div>
            <div className="stat-value">{stats.present}</div>
          </div>
          <div className="stat-card late">
            <div className="stat-label">Late</div>
            <div className="stat-value">{stats.late}</div>
          </div>
          <div className="stat-card absent">
            <div className="stat-label">Absent</div>
            <div className="stat-value">{stats.absent}</div>
          </div>
        </div>
      </section>

      {/* ATTENDANCE HISTORY SECTION */}
      <section className="history-section">
        <div className="history-header">
          <h3>Attendance History</h3>
          <div className="month-navigation">
            <button
              onClick={handlePreviousMonth}
              className="nav-btn"
              type="button"
            >
              ← Previous
            </button>
            <span className="current-month">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <button onClick={handleNextMonth} className="nav-btn" type="button">
              Next →
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <p>Loading attendance records...</p>
          </div>
        ) : attendanceList.length > 0 ? (
          <div className="attendance-table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendanceList.map((record, index) => {
                  const timeIn = record.time_in
                    ? new Date(record.time_in)
                    : null;
                  const timeOut = record.time_out
                    ? new Date(record.time_out)
                    : null;
                  const duration =
                    timeIn && timeOut
                      ? Math.round((timeOut - timeIn) / (1000 * 60)) // minutes
                      : null;

                  return (
                    <tr
                      key={index}
                      className={`status-${record.status || "absent"}`}
                    >
                      <td className="date-cell">
                        {format(
                          new Date(record.date || record.created_at),
                          "MMM dd, yyyy"
                        )}
                      </td>
                      <td className="time-cell">
                        {timeIn ? format(timeIn, "hh:mm:ss a") : "—"}
                      </td>
                      <td className="time-cell">
                        {timeOut ? format(timeOut, "hh:mm:ss a") : "—"}
                      </td>
                      <td className="duration-cell">
                        {duration ? `${duration}m` : "—"}
                      </td>
                      <td className="status-cell">
                        <span
                          className={`status-badge status-${
                            record.status || "absent"
                          }`}
                        >
                          {record.status === "late"
                            ? `Late (${record.late_minutes}m)`
                            : record.status === "present"
                            ? "Present"
                            : "Absent"}
                        </span>
                      </td>
                      <td className="notes-cell">{record.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-records">
            <p>No attendance records for {format(currentMonth, "MMMM yyyy")}</p>
          </div>
        )}
      </section>
    </div>
  );
}