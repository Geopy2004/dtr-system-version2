import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import Sidebar from "../../components/common/Sidebar.jsx";
import { attendanceAPI } from "../../services/api";
import styles from "./MyAttendance.module.css";

function statusClass(status) {
  if (!status) return "";

  switch (status.toLowerCase()) {
    case "present":
      return styles.statusPresent;
    case "late":
      return styles.statusLate;
    case "absent":
      return styles.statusAbsent;
    case "half-day":
    case "halfday":
      return styles.statusHalfDay;
    default:
      return "";
  }
}

function safeFormat(value, fmt) {
  if (!value) return "—";

  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";

  return format(date, fmt);
}

export default function MyAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch today's attendance
  useEffect(() => {
    async function fetchTodayAttendance() {
      try {
        const today = format(new Date(), "yyyy-MM-dd");
        const result = await attendanceAPI.getMyAttendance({
          startDate: today,
          endDate: today,
        });
        
        if (result?.attendance && result.attendance.length > 0) {
          setTodayAttendance(result.attendance[0]);
        } else {
          setTodayAttendance(null);
        }
      } catch (err) {
        console.error("Failed to fetch today's attendance:", err);
      }
    }
    
    fetchTodayAttendance();
  }, []);

  // Fetch attendance for selected month
  useEffect(() => {
    async function loadAttendance() {
      try {
        setLoading(true);
        setError("");

        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);

        const result = await attendanceAPI.getMyAttendance({
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(end, "yyyy-MM-dd"),
        });

        setAttendance(result?.attendance ?? []);
      } catch (err) {
        console.error(err);
        setError("Failed to load attendance records.");
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, [selectedMonth]);

  // Filter attendance based on search and status
  const filteredAttendance = useMemo(() => {
    let filtered = attendance;

    if (statusFilter !== "all") {
      filtered = filtered.filter(a => 
        a.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(a => 
        format(parseISO(a.date), "MMM dd, yyyy").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [attendance, statusFilter, searchTerm]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter(a => 
      a.status?.toLowerCase() === "present"
    ).length;
    const late = attendance.filter(a => 
      a.status?.toLowerCase() === "late"
    ).length;
    const absent = attendance.filter(a => 
      a.status?.toLowerCase() === "absent"
    ).length;
    const halfDay = attendance.filter(a => 
      a.status?.toLowerCase() === "half-day" || a.status?.toLowerCase() === "halfday"
    ).length;

    const totalLateMinutes = attendance.reduce((sum, a) => sum + (a.late_minutes || 0), 0);
    const attendanceRate = total === 0 ? 0 : Math.round((present / total) * 100);

    return {
      total,
      present,
      late,
      absent,
      halfDay,
      totalLateMinutes,
      attendanceRate
    };
  }, [attendance]);

  const handleMonthChange = (direction) => {
    if (direction === "prev") {
      setSelectedMonth(subMonths(selectedMonth, 1));
    } else {
      setSelectedMonth(subMonths(selectedMonth, -1));
    }
  };

  return (
    <div className={styles.layout}>
      <Sidebar />
      
      <div className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header */}
          <header className={styles.header}>
            <h1 className={styles.title}>My Attendance Record</h1>
            <p className={styles.subtitle}>Track your attendance history and performance</p>
          </header>

          {/* Today's Attendance Card */}
          <div className={styles.todayCard}>
            <div className={styles.todayHeader}>
              <h2>Today's Attendance</h2>
              <span className={styles.todayDate}>
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </span>
            </div>
            
            {todayAttendance ? (
              <div className={styles.todayInfo}>
                <div className={styles.todayTime}>
                  <div className={styles.timeItem}>
                    <span className={styles.timeLabel}>Time In:</span>
                    <strong>{safeFormat(todayAttendance.time_in, "hh:mm a")}</strong>
                  </div>
                  <div className={styles.timeItem}>
                    <span className={styles.timeLabel}>Time Out:</span>
                    <strong>{safeFormat(todayAttendance.time_out, "hh:mm a")}</strong>
                  </div>
                </div>
                <div className={styles.todayStatus}>
                  <span className={`${styles.statusBadge} ${statusClass(todayAttendance.status)}`}>
                    {todayAttendance.status || "Present"}
                  </span>
                </div>
              </div>
            ) : (
              <div className={styles.todayEmpty}>
                <p>No attendance record for today yet.</p>
                <small>Please check in when you start your work day.</small>
              </div>
            )}
          </div>

          {/* Statistics Summary */}
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{stats.total}</div>
              <div className={styles.statLabel}>Total Days</div>
            </div>
            <div className={`${styles.statBox} ${styles.statPresent}`}>
              <div className={styles.statValue}>{stats.present}</div>
              <div className={styles.statLabel}>Present</div>
            </div>
            <div className={`${styles.statBox} ${styles.statLate}`}>
              <div className={styles.statValue}>{stats.late}</div>
              <div className={styles.statLabel}>Late</div>
            </div>
            <div className={`${styles.statBox} ${styles.statAbsent}`}>
              <div className={styles.statValue}>{stats.absent}</div>
              <div className={styles.statLabel}>Absent</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{stats.halfDay}</div>
              <div className={styles.statLabel}>Half Day</div>
            </div>
            <div className={styles.statBox}>
              <div className={styles.statValue}>{stats.totalLateMinutes}</div>
              <div className={styles.statLabel}>Late Minutes</div>
            </div>
          </div>

          {/* Rate Card */}
          <div className={styles.rateCard}>
            <div className={styles.rateHeader}>
              <h3>Attendance Rate</h3>
              <strong className={styles.ratePercent}>{stats.attendanceRate}%</strong>
            </div>
            <div className={styles.rateTrack}>
              <div 
                className={styles.rateFill} 
                style={{ width: `${stats.attendanceRate}%` }}
              />
            </div>
          </div>

          {/* Filters and Controls */}
          <div className={styles.controls}>
            <div className={styles.monthNavigation}>
              <button onClick={() => handleMonthChange("prev")} className={styles.navButton}>
                ← Previous Month
              </button>
              <span className={styles.currentMonth}>
                {format(selectedMonth, "MMMM yyyy")}
              </span>
              <button onClick={() => handleMonthChange("next")} className={styles.navButton}>
                Next Month →
              </button>
            </div>

            <div className={styles.filters}>
              <input
                type="text"
                placeholder="Search by date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
                <option value="half-day">Half Day</option>
              </select>
            </div>
          </div>

          {/* Attendance Table */}
          {loading ? (
            <div className={styles.loadingState}>Loading attendance records...</div>
          ) : error ? (
            <div className={styles.errorState}>{error}</div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Status</th>
                    <th>Late Minutes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.length > 0 ? (
                    filteredAttendance.map((record, index) => (
                      <tr key={record.id}>
                        <td>{index + 1}</td>
                        <td>{safeFormat(record.date, "MMM dd, yyyy")}</td>
                        <td>{safeFormat(record.date, "EEEE")}</td>
                        <td>{safeFormat(record.time_in, "hh:mm a")}</td>
                        <td>{safeFormat(record.time_out, "hh:mm a")}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${statusClass(record.status)}`}>
                            {record.status || "Present"}
                          </span>
                        </td>
                        <td>{record.late_minutes || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className={styles.noData}>
                        No attendance records found for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}