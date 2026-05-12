import { useState, useEffect, useCallback } from "react";
import { attendanceAPI } from "../../services/api";
import toast from "react-hot-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiTrendingUp,
  FiUserCheck,
  FiUserX,
  FiXCircle,
} from "react-icons/fi";
import { HiOutlineOfficeBuilding } from "react-icons/hi";
import Sidebar from "../../components/common/Sidebar";
import TimeInOut from "./timeinout.jsx";
import Loader from "../../components/common/Loader";
import "./myattendance.css";

export default function MyAttendance() {
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchAttendanceHistory = useCallback(async () => {
    try {
      setLoading(true);

      const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      const result = await attendanceAPI.getMyAttendance({
        startDate,
        endDate,
      });
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
  }, [currentMonth]);

  useEffect(() => {
    let isMounted = true;

    const loadAttendance = async () => {
      if (isMounted) {
        await fetchAttendanceHistory();
      }
    };

    loadAttendance();

    return () => {
      isMounted = false;
    };
  }, [fetchAttendanceHistory]);

  const handleAttendanceUpdate = useCallback(
    (attendance) => {
      if (!attendance) return;

      const today = format(new Date(), "yyyy-MM-dd");
      const existingIndex = attendanceList.findIndex(
        (record) =>
          format(new Date(record.date || record.created_at), "yyyy-MM-dd") ===
          today
      );

      if (existingIndex >= 0) {
        const updated = [...attendanceList];
        updated[existingIndex] = attendance;
        setAttendanceList(updated);
        return;
      }

      setAttendanceList([attendance, ...attendanceList]);
    },
    [attendanceList]
  );

  const handlePreviousMonth = useCallback(() => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  }, [currentMonth]);

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
  const completed = attendanceList.filter(
    (record) => record.time_in && record.time_out
  ).length;
  const completionRate = stats.total
    ? Math.round((completed / stats.total) * 100)
    : 0;

  return (
    <div className="attendance-layout">
      <Sidebar />
      <main className="myattendance-container">
        <div className="attendance-header">
          <div className="header-icon">
            <HiOutlineOfficeBuilding />
          </div>

          <div className="header-text">
            <span className="attendance-eyebrow">Employee Time Record</span>
            <h2>My Attendance</h2>
            <p className="subtitle">Track your attendance and time records</p>
          </div>
        </div>

        <div className="attendance-overview-grid">
          <section className="timeinout-section">
            <TimeInOut onAttendanceUpdate={handleAttendanceUpdate} />
          </section>

          <section className="statistics-section">
            <div className="section-heading-row">
              <h3>
                <FiTrendingUp className="section-icon" />
                Monthly Statistics
              </h3>
              <span className="section-pill">{format(currentMonth, "MMMM yyyy")}</span>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <FiCalendar />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Total Days</div>
                  <div className="stat-value">{stats.total}</div>
                </div>
              </div>

              <div className="stat-card present">
                <div className="stat-icon">
                  <FiCheckCircle />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Present</div>
                  <div className="stat-value">{stats.present}</div>
                </div>
              </div>

              <div className="stat-card late">
                <div className="stat-icon">
                  <FiAlertCircle />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Late</div>
                  <div className="stat-value">{stats.late}</div>
                </div>
              </div>

              <div className="stat-card absent">
                <div className="stat-icon">
                  <FiXCircle />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Absent</div>
                  <div className="stat-value">{stats.absent}</div>
                </div>
              </div>

              <div className="stat-card complete">
                <div className="stat-icon">
                  <FiClock />
                </div>
                <div className="stat-content">
                  <div className="stat-label">Complete</div>
                  <div className="stat-value">{completionRate}%</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="history-section">
          <div className="history-header">
            <h3>
              <FiClock className="section-icon" />
              Attendance History
            </h3>

            <div className="month-navigation">
              <button
                onClick={handlePreviousMonth}
                className="nav-btn"
                type="button"
              >
                <FiChevronLeft />
                Previous
              </button>

              <span className="current-month">
                {format(currentMonth, "MMMM yyyy")}
              </span>

              <button
                onClick={handleNextMonth}
                className="nav-btn"
                type="button"
              >
                Next
                <FiChevronRight />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="attendance-loading">
              <Loader />
            </div>
          ) : attendanceList.length > 0 ? (
            <div className="attendance-table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>
                      <FiCalendar /> Date
                    </th>
                    <th>
                      <FiUserCheck /> Time In
                    </th>
                    <th>
                      <FiUserX /> Time Out
                    </th>
                    <th>
                      <FiClock /> Duration
                    </th>
                    <th>Status</th>
                    <th>
                      <FiFileText /> Notes
                    </th>
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
                        ? Math.round((timeOut - timeIn) / (1000 * 60))
                        : null;

                    return (
                      <tr
                        key={record.id || index}
                        className={`status-${record.status || "absent"}`}
                      >
                        <td className="date-cell">
                          {format(
                            new Date(record.date || record.created_at),
                            "MMM dd, yyyy"
                          )}
                        </td>
                        <td className="time-cell">
                          {timeIn ? format(timeIn, "hh:mm:ss a") : "-"}
                        </td>
                        <td className="time-cell">
                          {timeOut ? format(timeOut, "hh:mm:ss a") : "-"}
                        </td>
                        <td className="duration-cell">
                          {duration ? `${duration}m` : "-"}
                        </td>
                        <td className="status-cell">
                          <span
                            className={`status-badge status-${
                              record.status || "absent"
                            }`}
                          >
                            {record.status === "late"
                              ? `Late (${record.late_minutes || 0}m)`
                              : record.status === "present"
                              ? "Present"
                              : "Absent"}
                          </span>
                        </td>
                        <td className="notes-cell">{record.notes || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-records">
              <FiCalendar className="no-records-icon" />
              <p>No attendance records for {format(currentMonth, "MMMM yyyy")}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
