import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";

import TimeInOut from "../../components/users/timeinout";
import { attendanceAPI } from "../../services/api";
import styles from "./UserDashboard.module.css";

// ─────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// reusable stat card
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// dashboard
// ─────────────────────────────────────────────────────────────

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

  const today = useMemo(() => new Date(), []);

  // ───────────────────────────────────────────────────────────
  // fetch dashboard data
  // ───────────────────────────────────────────────────────────

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
        console.error("Dashboard error:", err);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  // ───────────────────────────────────────────────────────────
  // computed values
  // ───────────────────────────────────────────────────────────

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

  // ───────────────────────────────────────────────────────────
  // render
  // ───────────────────────────────────────────────────────────

  return (
    <div className={styles.dashboard}>
      {/* HEADER */}

      <header className={styles.header}>
        <div>
          <p className={styles.headerDate}>
            {format(today, "EEEE, MMMM d, yyyy")}
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
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <rect
                x="3"
                y="4"
                width="14"
                height="13"
                rx="2"
              />
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
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M4 10.5l4 4 8-8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />

        <StatCard
          label="Late Days"
          value={stats.late}
          subtitle="Times late"
          accent="amber"
          icon={
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="10" cy="10" r="7" />
              <path
                d="M10 6v4l2.5 2.5"
                strokeLinecap="round"
              />
            </svg>
          }
        />

        <StatCard
          label="Late Minutes"
          value={stats.total_late_minutes}
          subtitle="Total minutes"
          accent="red"
          icon={
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="10" cy="10" r="7" />
              <path
                d="M10 5v5l3 2"
                strokeLinecap="round"
              />
            </svg>
          }
        />
      </section>

      {/* ATTENDANCE RATE */}

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

      {/* TIME IN / OUT */}

      <section className={styles.timeSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Time Monitoring
          </h2>

          <span className={styles.sectionSub}>
            Daily attendance actions
          </span>
        </div>

        <TimeInOut />
      </section>

      {/* RECENT ATTENDANCE */}

      <section className={styles.recentSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Recent Attendance
          </h2>

          <span className={styles.sectionSub}>
            Last 5 attendance records
          </span>
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            Loading attendance records...
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            {error}
          </div>
        ) : recentAttendance.length === 0 ? (
          <div className={styles.emptyState}>
            No attendance records found.
          </div>
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
                {recentAttendance.map((record) => (
                  <tr key={record.id}>
                    <td className={styles.dateCell}>
                      {safeFormat(
                        record.date,
                        "MMM dd, yyyy"
                      )}
                    </td>

                    <td>
                      {safeFormat(
                        record.time_in,
                        "hh:mm a"
                      )}
                    </td>

                    <td>
                      {record.time_out ? (
                        safeFormat(
                          record.time_out,
                          "hh:mm a"
                        )
                      ) : (
                        <span className={styles.dash}>
                          —
                        </span>
                      )}
                    </td>

                    <td>
                      <span
                        className={`${styles.statusBadge} ${statusClass(
                          record.status
                        )}`}
                      >
                        {record.status
                          ? record.status
                              .replace("-", " ")
                              .replace(
                                /\b\w/g,
                                (c) => c.toUpperCase()
                              )
                          : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}