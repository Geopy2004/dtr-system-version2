import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";

import TimeInOut from "../../components/users/timeinout";
import Sidebar from "../../components/common/Sidebar.jsx";
import { attendanceAPI } from "../../services/api";

import styles from "./UserDashboard.module.css";

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────

function StatCard({ label, value, icon, accent, subtitle }) {
  return (
    <div
      className={`${styles.statCard} ${
        accent ? styles[`accent_${accent}`] : ""
      }`}
    >
      <div className={styles.statTop}>
        <div className={styles.statIcon}>{icon}</div>
      </div>

      <div className={styles.statBody}>
        <h3 className={styles.statValue}>{value ?? 0}</h3>
        <p className={styles.statLabel}>{label}</p>

        {subtitle && (
          <span className={styles.statSubtitle}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────

export default function UserDashboard() {
  const [stats, setStats] = useState({
    total_days: 0,
    present: 0,
    late: 0,
    total_late_minutes: 0,
  });

  const [recentAttendance, setRecentAttendance] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [now, setNow] = useState(new Date());

  const today = useMemo(() => new Date(), []);

  // LIVE CLOCK
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // DATE RANGE
  const { startDate, endDate } = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());

    return {
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(end, "yyyy-MM-dd"),
    };
  }, []);

  // FETCH DATA
  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [statsResult, recentResult] =
          await Promise.all([
            attendanceAPI.getMyAttendance({
              startDate,
              endDate,
            }),
            attendanceAPI.getMyAttendance({
              limit: 5,
            }),
          ]);

        setStats(
          statsResult?.stats ?? {
            total_days: 0,
            present: 0,
            late: 0,
            total_late_minutes: 0,
          }
        );

        setRecentAttendance(
          recentResult?.attendance ?? []
        );
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [startDate, endDate]);

  // ATTENDANCE RATE
  const attendanceRate = useMemo(() => {
    if (!stats.total_days) return 0;

    return Math.round(
      (stats.present / stats.total_days) * 100
    );
  }, [stats]);

  const attendanceMessage = useMemo(() => {
    if (attendanceRate >= 90)
      return "Excellent attendance";
    if (attendanceRate >= 75)
      return "Good attendance";
    return "Needs improvement";
  }, [attendanceRate]);

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

  return (
    <div className={styles.layout}>
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN */}
      <div className={styles.dashboard}>
        {/* HEADER */}
        <header className={styles.header}>
          <div>
            <p className={styles.headerDate}>
              {format(now, "EEEE, MMMM d, yyyy")} •{" "}
              <span className={styles.clock}>
                {format(now, "hh:mm:ss a")}
              </span>
            </p>

            <h1 className={styles.headerTitle}>
              Welcome Back 👋
            </h1>

            <p className={styles.headerSubtitle}>
              Here's your attendance overview for this
              month.
            </p>
          </div>

          <div className={styles.headerMonth}>
            {format(today, "MMMM yyyy")}
          </div>
        </header>

        {/* STATS */}
        <section className={styles.statsGrid}>
          <StatCard
            label="Total Days"
            value={stats.total_days}
            accent="default"
            icon="📅"
          />
          <StatCard
            label="Present"
            value={stats.present}
            accent="green"
            icon="✅"
          />
          <StatCard
            label="Late Days"
            value={stats.late}
            accent="amber"
            icon="⏰"
          />
          <StatCard
            label="Late Minutes"
            value={stats.total_late_minutes}
            accent="red"
            icon="⏱️"
          />
        </section>

        {/* RATE */}
        <section className={styles.rateCard}>
          <div className={styles.rateHeader}>
            <div>
              <h2>Monthly Attendance Rate</h2>
              <p>{attendanceMessage}</p>
            </div>
            <strong>{attendanceRate}%</strong>
          </div>

          <div className={styles.rateTrack}>
            <div
              className={styles.rateFill}
              style={{
                width: `${attendanceRate}%`,
              }}
            />
          </div>
        </section>

        {/* TIME */}
        <section className={styles.timeSection}>
          <h2 className={styles.sectionTitle}>
            Time Monitoring
          </h2>
          <TimeInOut />
        </section>

        {/* RECENT */}
        <section className={styles.recentSection}>
          <h2 className={styles.sectionTitle}>
            Recent Attendance
          </h2>

          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div>{error}</div>
          ) : (
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
                {recentAttendance.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {safeFormat(r.date, "MMM dd, yyyy")}
                    </td>
                    <td>
                      {safeFormat(r.time_in, "hh:mm a")}
                    </td>
                    <td>
                      {r.time_out
                        ? safeFormat(
                            r.time_out,
                            "hh:mm a"
                          )
                        : "—"}
                    </td>
                    <td
                      className={statusClass(r.status)}
                    >
                      {r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}