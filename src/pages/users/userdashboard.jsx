import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/common/Sidebar.jsx";
import { attendanceAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext"; // Assuming you have auth context

import styles from "./UserDashboard.module.css";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function statusClass(status) {
  if (!status) return "";
  switch (status.toLowerCase()) {
    case "present":  return styles.statusPresent;
    case "late":     return styles.statusLate;
    case "absent":   return styles.statusAbsent;
    case "half-day":
    case "halfday":  return styles.statusHalfDay;
    default:         return "";
  }
}

function safeFormat(value, fmt) {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "—";
  return format(date, fmt);
}

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────

function StatCard({ label, value, icon, accent, subtitle }) {
  return (
    <div className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""}`}>
      <div className={styles.statTop}>
        <div className={styles.statIcon}>{icon}</div>
      </div>
      <div className={styles.statBody}>
        <h3 className={styles.statValue}>{value ?? 0}</h3>
        <p className={styles.statLabel}>{label}</p>
        {subtitle && <span className={styles.statSubtitle}>{subtitle}</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth(); // Get current user from auth context
  
  const [stats, setStats] = useState({
    total_days: 0,
    present: 0,
    late: 0,
    total_late_minutes: 0,
  });

  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [now, setNow]           = useState(new Date());

  // LIVE CLOCK
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // DATE RANGE
  const { startDate, endDate } = useMemo(() => {
    const start = startOfMonth(new Date());
    const end   = endOfMonth(new Date());
    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate:   format(end,   "yyyy-MM-dd"),
    };
  }, []);

  // FETCH DATA
  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        // Verify user exists before making API calls
        if (!user || !user.id) {
          setError("User not authenticated. Please log in.");
          return;
        }

        // Check if attendanceAPI has the getMyAttendance method
        if (!attendanceAPI || typeof attendanceAPI.getMyAttendance !== 'function') {
          console.error("attendanceAPI.getMyAttendance is not available");
          setError("API method not available. Please check your API configuration.");
          return;
        }

        // Make API calls with proper date range
        const [statsResult, recentResult] = await Promise.all([
          attendanceAPI.getMyAttendance({ 
            startDate, 
            endDate,
            userId: user.id // Explicitly pass user ID
          }),
          attendanceAPI.getMyAttendance({ 
            limit: 5,
            userId: user.id // Explicitly pass user ID
          }),
        ]);

        // Safely set stats with defaults
        setStats(statsResult?.stats ?? {
          total_days: 0, 
          present: 0, 
          late: 0, 
          total_late_minutes: 0,
        });

        // Safely set attendance records
        setRecentAttendance(recentResult?.attendance ?? []);
      } catch (err) {
        console.error("Dashboard error:", err);
        
        // Provide user-friendly error messages
        if (err.code === '22P02') {
          setError("Invalid user ID format. Please refresh and try again.");
        } else if (err.status === 400) {
          setError("Invalid request parameters. Please contact support.");
        } else {
          setError(err.message || "Failed to load dashboard data.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [startDate, endDate, user]);

  // ATTENDANCE RATE
  const attendanceRate = useMemo(() => {
    if (!stats.total_days) return 0;
    return Math.round((stats.present / stats.total_days) * 100);
  }, [stats]);

  const attendanceMessage = useMemo(() => {
    if (attendanceRate >= 90) return "Excellent attendance";
    if (attendanceRate >= 75) return "Good attendance";
    return "Needs improvement";
  }, [attendanceRate]);

  // Show loading state until user is loaded
  if (!user) {
    return (
      <div className={styles.layout}>
        <Sidebar />
        <div className={styles.mainContent}>
          <div className={styles.dashboard}>
            <div className={styles.loadingState}>Initializing...</div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

  return (
    <div className={styles.layout}>
      <Sidebar />

      <div className={styles.mainContent}>
        <div className={styles.dashboard}>

          {/* ── HEADER ── */}
          <header className={styles.header}>
            {/* Top row: date/clock + month badge */}
            <div className={styles.headerTop}>
              <div className={styles.headerMeta}>
                <span className={styles.headerDate}>
                  {format(now, "EEEE, MMMM d, yyyy")}
                </span>
                <span className={styles.headerDot}>•</span>
                <span className={styles.clock}>
                  {format(now, "hh:mm:ss a")}
                </span>
              </div>
              <div className={styles.headerMonth}>
                {format(new Date(), "MMMM yyyy")}
              </div>
            </div>

            {/* Bottom row: title + subtitle */}
            <div className={styles.headerLeft}>
              <h1 className={styles.headerTitle}>
                Welcome Back <span className={styles.wave}>👋</span>
              </h1>
              <p className={styles.headerSubtitle}>
                Here's your attendance overview for this month.
              </p>
            </div>
          </header>

          {/* ── STATS GRID ── */}
          <div className={styles.statsGrid}>
            <StatCard label="Total Days"    value={stats.total_days}          accent="default" icon="📅" />
            <StatCard label="Present"       value={stats.present}             accent="green"   icon="✅" />
            <StatCard label="Late Days"     value={stats.late}                accent="amber"   icon="⏰" />
            <StatCard label="Late Minutes"  value={stats.total_late_minutes}  accent="red"     icon="⏱️" />
          </div>

          {/* ── RATE CARD ── */}
          <div className={styles.rateCard}>
            <div className={styles.rateHeader}>
              <div>
                <h2>Monthly Attendance Rate</h2>
                <p>{attendanceMessage}</p>
              </div>
              <strong>{attendanceRate}%</strong>
            </div>
            <div className={styles.rateTrack}>
              <div className={styles.rateFill} style={{ width: `${attendanceRate}%` }} />
            </div>
          </div>

          {/* ── RECENT ATTENDANCE ── */}
          <div className={styles.recentSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Attendance</h2>
              <button
                className={styles.viewAllButton}
                onClick={() => navigate("/my-attendance")}
              >
                View All →
              </button>
            </div>

            {loading ? (
              <div className={styles.loadingState}>Loading...</div>
            ) : error ? (
              <div className={styles.errorState}>{error}</div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time In</th>
                      <th>Time Out</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAttendance.length > 0 ? (
                      recentAttendance.map((r) => (
                        <tr key={r.id}>
                          <td>{safeFormat(r.date,     "MMM dd, yyyy")}</td>
                          <td>{safeFormat(r.time_in,  "hh:mm a")}</td>
                          <td>{r.time_out ? safeFormat(r.time_out, "hh:mm a") : "—"}</td>
                          <td className={statusClass(r.status)}>{r.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className={styles.noData}>
                          No attendance records found
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
    </div>
  );
}