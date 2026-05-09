import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";

import Navbar from "../../components/layout/navbar";
import TimeInOut from "../../components/users/timeinout";
import { attendanceAPI } from "../../services/api";
import styles from "./UserDashboard.module.css";

// ─────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────

function statusClass(status) {
  if (!status) return "";

  const s = status.toLowerCase();

  switch (s) {
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
  try {
    if (!value) return "—";

    const date = new Date(value);
    if (isNaN(date.getTime())) return "—";

    return format(date, fmt);
  } catch {
    return "—";
  }
}

// ─────────────────────────────────────────────
// stat card
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
          <span className={styles.statSubtitle}>{subtitle}</span>
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

  const [recentAttendance, setRecentAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ REAL-TIME CLOCK STATE
  const [now, setNow] = useState(new Date());

  const today = useMemo(() => new Date(), []);

  // ─────────────────────────────────────────────
  // LIVE CLOCK UPDATE (EVERY SECOND)
  // ─────────────────────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ─────────────────────────────────────────────
  // FETCH DATA
  // ─────────────────────────────────────────────

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const startDate = format(
          startOfMonth(new Date()),
          "yyyy-MM-dd"
        );

        const endDate = format(
          endOfMonth(new Date()),
          "yyyy-MM-dd"
        );

        const [statsResult, recentResult] = await Promise.all([
          attendanceAPI.getMyAttendance({
            startDate,
            endDate,
          }),

          attendanceAPI.getMyAttendance({
            limit: 5,
          }),
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
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // ─────────────────────────────────────────────
  // COMPUTED
  // ─────────────────────────────────────────────

  const attendanceRate =
    stats.total_days > 0
      ? Math.round((stats.present / stats.total_days) * 100)
      : 0;

  const attendanceMessage =
    attendanceRate >= 90
      ? "Excellent attendance"
      : attendanceRate >= 75
      ? "Good attendance"
      : "Needs improvement";

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

  return (
    <div className={styles.dashboard}>

      <Navbar />

      {/* HEADER */}
      <header className={styles.header}>
        <div>

          {/* ✅ LIVE DATE + CLOCK */}
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
            Here's your attendance overview for this month.
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
          subtitle="Working days"
          accent="default"
          icon={
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <rect x="3" y="4" width="14" height="13" rx="2" />
              <path d="M3 8h14M7 2v4M13 2v4" />
            </svg>
          }
        />

        <StatCard
          label="Present"
          value={stats.present}
          subtitle="Attendance days"
          accent="green"
          icon={
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M4 10.5l4 4 8-8" />
            </svg>
          }
        />

        <StatCard
          label="Late Days"
          value={stats.late}
          subtitle="Times late"
          accent="amber"
          icon={
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <circle cx="10" cy="10" r="7" />
              <path d="M10 6v4l2.5 2.5" />
            </svg>
          }
        />

        <StatCard
          label="Late Minutes"
          value={stats.total_late_minutes}
          subtitle="Total minutes"
          accent="red"
          icon={
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <circle cx="10" cy="10" r="7" />
              <path d="M10 5v5l3 2" />
            </svg>
          }
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
            style={{ width: `${attendanceRate}%` }}
          />
        </div>
      </section>

      {/* TIME IN OUT */}
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
          <div>Loading attendance records...</div>
        ) : error ? (
          <div>{error}</div>
        ) : recentAttendance.length === 0 ? (
          <div>No attendance records found.</div>
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
              {recentAttendance.map((record) => (
                <tr key={record.id}>
                  <td>
                    {safeFormat(record.date, "MMM dd, yyyy")}
                  </td>

                  <td>
                    {safeFormat(record.time_in, "hh:mm a")}
                  </td>

                  <td>
                    {record.time_out
                      ? safeFormat(record.time_out, "hh:mm a")
                      : "—"}
                  </td>

                  <td className={statusClass(record.status)}>
                    {record.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}