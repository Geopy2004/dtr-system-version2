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
  FiEye,
  FiFileText,
  FiPrinter,
  FiTrendingUp,
  FiUserCheck,
  FiUserX,
  FiX,
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
  const [selectedRecord, setSelectedRecord] = useState(null);

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

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const getRecordDuration = useCallback((record) => {
    const timeIn = record?.morning_time_in || record?.time_in;
    const timeOut = record?.afternoon_time_out || record?.time_out;
    const start = timeIn ? new Date(timeIn) : null;
    const end = timeOut ? new Date(timeOut) : null;

    if (!start || !end) return "-";

    const minutes = Math.round((end - start) / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours <= 0) return `${minutes}m`;
    return `${hours}h ${remainingMinutes}m`;
  }, []);

  const getRecordStatusLabel = useCallback((record) => {
    if (record?.status === "late") {
      return `Late (${record.late_minutes || 0}m)`;
    }

    if (record?.status === "present") return "Present";
    if (record?.status === "half-day" || record?.status === "halfday") {
      return "Half Day";
    }

    return "Absent";
  }, []);

  const formatRecordTime = useCallback((record, field, fallbackField) => {
    const value = record?.[field] || record?.[fallbackField];
    return value ? format(new Date(value), "hh:mm:ss a") : "-";
  }, []);

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
    (record) =>
      (record.morning_time_in || record.time_in) &&
      (record.afternoon_time_out || record.time_out)
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
                onClick={handlePrint}
                className="nav-btn print-btn"
                type="button"
                disabled={loading || attendanceList.length === 0}
                title="Print attendance"
              >
                <FiPrinter />
                Print
              </button>

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
                      <FiUserCheck /> Morning In
                    </th>
                    <th>
                      <FiUserX /> Lunch Out
                    </th>
                    <th>
                      <FiUserCheck /> Lunch In
                    </th>
                    <th>
                      <FiUserX /> Afternoon Out
                    </th>
                    <th>
                      <FiClock /> Duration
                    </th>
                    <th>Status</th>
                    <th>
                      <FiFileText /> Notes
                    </th>
                    <th>View</th>
                  </tr>
                </thead>

                <tbody>
                  {attendanceList.map((record, index) => {
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
                          {formatRecordTime(record, "morning_time_in", "time_in")}
                        </td>
                        <td className="time-cell">
                          {formatRecordTime(record, "lunch_time_out")}
                        </td>
                        <td className="time-cell">
                          {formatRecordTime(record, "lunch_time_in")}
                        </td>
                        <td className="time-cell">
                          {formatRecordTime(
                            record,
                            "afternoon_time_out",
                            "time_out"
                          )}
                        </td>
                        <td className="duration-cell">
                          {getRecordDuration(record)}
                        </td>
                        <td className="status-cell">
                          <span
                            className={`status-badge status-${
                              record.status || "absent"
                            }`}
                          >
                            {getRecordStatusLabel(record)}
                          </span>
                        </td>
                        <td className="notes-cell">{record.notes || "-"}</td>
                        <td className="action-cell">
                          <button
                            className="icon-action-btn"
                            type="button"
                            onClick={() => setSelectedRecord(record)}
                            title="View attendance details"
                            aria-label="View attendance details"
                          >
                            <FiEye />
                          </button>
                        </td>
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

      {selectedRecord && (
        <div
          className="attendance-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedRecord(null)}
        >
          <section
            className="attendance-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-details-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="attendance-modal-header">
              <div>
                <span className="attendance-eyebrow">Attendance Details</span>
                <h3 id="attendance-details-title">
                  {format(
                    new Date(selectedRecord.date || selectedRecord.created_at),
                    "MMMM dd, yyyy"
                  )}
                </h3>
              </div>

              <button
                className="icon-action-btn"
                type="button"
                onClick={() => setSelectedRecord(null)}
                title="Close details"
                aria-label="Close details"
              >
                <FiX />
              </button>
            </div>

            <div className="details-grid">
              <div className="detail-item">
                <span>Date</span>
                <strong>
                  {format(
                    new Date(selectedRecord.date || selectedRecord.created_at),
                    "MMM dd, yyyy"
                  )}
                </strong>
              </div>
              <div className="detail-item">
                <span>Status</span>
                <strong>{getRecordStatusLabel(selectedRecord)}</strong>
              </div>
              <div className="detail-item">
                <span>Morning In</span>
                <strong>
                  {formatRecordTime(selectedRecord, "morning_time_in", "time_in")}
                </strong>
              </div>
              <div className="detail-item">
                <span>Lunch Out</span>
                <strong>{formatRecordTime(selectedRecord, "lunch_time_out")}</strong>
              </div>
              <div className="detail-item">
                <span>Lunch In</span>
                <strong>{formatRecordTime(selectedRecord, "lunch_time_in")}</strong>
              </div>
              <div className="detail-item">
                <span>Afternoon Out</span>
                <strong>
                  {formatRecordTime(
                    selectedRecord,
                    "afternoon_time_out",
                    "time_out"
                  )}
                </strong>
              </div>
              <div className="detail-item">
                <span>Duration</span>
                <strong>{getRecordDuration(selectedRecord)}</strong>
              </div>
              <div className="detail-item">
                <span>Late Minutes</span>
                <strong>{selectedRecord.late_minutes || 0}m</strong>
              </div>
            </div>

            <div className="detail-notes">
              <span>Notes</span>
              <p>{selectedRecord.notes || "No notes recorded."}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
