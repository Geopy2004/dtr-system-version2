import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiLogIn,
  FiTrendingUp,
  FiUserCheck,
} from "react-icons/fi";
import { endOfMonth, format, startOfMonth } from "date-fns";
import AppShell from "../../components/common/AppShell";
import TimeInOut from "./timeinout";
import { useAuth } from "../../context/AuthContext";
import {
  attendanceAPI,
  leaveAPI,
  realtimeAPI,
} from "../../services/api";
import { seedAttendance, seedLeaves } from "../../data/platformSeed";
import {
  buildDashboardStats,
  buildMonthlyChart,
  buildWeeklyChart,
  formatDate,
  formatTime,
  getRecordEnd,
  getRecordStart,
  getStatusLabel,
  getTodayRecord,
} from "../../utils/attendance";

const chartColors = {
  present: "#22c55e",
  late: "#f59e0b",
  absent: "#f43f5e",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((entry) => (
        <span key={entry.dataKey}>
          {entry.name || entry.dataKey}: {entry.value}
        </span>
      ))}
    </div>
  );
};

export default function UserDashboard() {
  const { profile, user } = useAuth();
  const [clock, setClock] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const displayName =
    profile?.full_name || profile?.name || user?.email?.split("@")[0] || "Operator";

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
      const [attendanceResult, leaveResult] = await Promise.all([
        attendanceAPI.getMyAttendance({ startDate: monthStart, endDate: monthEnd }),
        leaveAPI.getMyLeaves(),
      ]);
      setRecords(attendanceResult.attendance || []);
      setLeaves(leaveResult || []);
    } catch (error) {
      console.warn("Dashboard preview data loaded:", error?.message);
      setRecords(seedAttendance);
      setLeaves(seedLeaves);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(loadDashboard, 0);
    return () => window.clearTimeout(handle);
  }, [loadDashboard]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    return realtimeAPI.subscribeToAttendance(loadDashboard, `user_id=eq.${user.id}`);
  }, [loadDashboard, user?.id]);

  const stats = useMemo(() => buildDashboardStats(records), [records]);
  const weeklyChart = useMemo(() => buildWeeklyChart(records), [records]);
  const monthlyChart = useMemo(() => buildMonthlyChart(records), [records]);
  const todayRecord = useMemo(() => getTodayRecord(records), [records]);
  const recentRecords = useMemo(() => records.slice(0, 5), [records]);
  const pendingLeaves = leaves.filter((leave) => leave.status === "pending").length;

  const metrics = [
    {
      label: "Working Days",
      value: stats.workingDays,
      trend: "Current month",
      icon: <FiCalendar />,
      glow: "rgba(34, 211, 238, 0.34)",
    },
    {
      label: "Present Days",
      value: stats.present,
      trend: `${stats.attendancePercentage}% attendance`,
      icon: <FiUserCheck />,
      glow: "rgba(34, 197, 94, 0.32)",
    },
    {
      label: "Late Days",
      value: stats.late,
      trend: `${stats.totalLateMinutes} late minutes`,
      icon: <FiClock />,
      glow: "rgba(245, 158, 11, 0.34)",
    },
    {
      label: "Worked Hours",
      value: `${stats.totalWorkedHours}h`,
      trend: `${stats.absent} absences projected`,
      icon: <FiTrendingUp />,
      glow: "rgba(236, 72, 153, 0.3)",
    },
  ];

  return (
    <AppShell>
      <div className="page page-stack">
        <section className="hero-panel glass-card">
          <div>
            <span className="eyebrow">Employee Command</span>
            <h1 className="page-title">Welcome, {displayName}</h1>
            <p className="page-subtitle">
              {format(clock, "EEEE, MMMM dd, yyyy")} at{" "}
              <strong className="mono-time">{format(clock, "hh:mm:ss a")}</strong>
            </p>
          </div>

          <div className="status-orbit">
            <span className="status-dot" />
            <strong>{todayRecord ? getStatusLabel(todayRecord.status) : "Not checked in"}</strong>
            <small>
              {todayRecord
                ? `${formatTime(getRecordStart(todayRecord))} to ${formatTime(getRecordEnd(todayRecord))}`
                : "Ready for time in"}
            </small>
          </div>
        </section>

        <section className="metric-grid">
          {metrics.map((metric, index) => (
            <motion.article
              className="metric-card"
              style={{ "--metric-glow": metric.glow }}
              key={metric.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <div className="metric-icon">{metric.icon}</div>
              <div className="metric-value">{loading ? <span className="skeleton text-skeleton" /> : metric.value}</div>
              <div className="metric-label">{metric.label}</div>
              <div className="metric-trend">{metric.trend}</div>
            </motion.article>
          ))}
        </section>

        <section className="dashboard-grid">
          <div className="page-stack">
            <TimeInOut onAttendanceUpdate={loadDashboard} />

            <div className="chart-card">
              <div className="card-title-row">
                <div>
                  <span className="eyebrow">Weekly Rhythm</span>
                  <h2>Worked hours and late minutes</h2>
                </div>
                <span className="pill">
                  <span className="status-dot" />
                  Live sync
                </span>
              </div>
              <div className="chart-height">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyChart}>
                    <defs>
                      <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis dataKey="day" stroke="#8fa2cb" tickLine={false} axisLine={false} />
                    <YAxis stroke="#8fa2cb" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      name="Hours"
                      stroke="#06b6d4"
                      fill="url(#hoursGradient)"
                      strokeWidth={3}
                    />
                    <Bar dataKey="late" name="Late minutes" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <aside className="page-stack">
            <div className="chart-card">
              <div className="card-title-row">
                <div>
                  <span className="eyebrow">Monthly Overview</span>
                  <h3>Attendance mix</h3>
                </div>
                <FiBarChart2 />
              </div>
              <div className="compact-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChart}>
                    <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                    <XAxis dataKey="week" stroke="#8fa2cb" tickLine={false} axisLine={false} />
                    <YAxis stroke="#8fa2cb" tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="present" stackId="a" fill={chartColors.present} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="late" stackId="a" fill={chartColors.late} />
                    <Bar dataKey="absent" stackId="a" fill={chartColors.absent} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card">
              <div className="card-title-row">
                <h3>Quick Actions</h3>
                <FiActivity />
              </div>
              <div className="quick-action-grid">
                <Link className="quick-action" to="/user/myattendance">
                  <FiLogIn />
                  Attendance
                </Link>
                <Link className="quick-action" to="/user/logs">
                  <FiFileText />
                  Logs
                </Link>
                <Link className="quick-action" to="/user/leave">
                  <FiCalendar />
                  Leave
                </Link>
                <button className="quick-action" type="button" onClick={() => window.print()}>
                  <FiCheckCircle />
                  Print DTR
                </button>
              </div>
            </div>

            <div className="table-card">
              <div className="card-title-row">
                <h3>Recent Activity</h3>
                <span className="pill">{pendingLeaves} pending leaves</span>
              </div>
              <div className="timeline">
                {recentRecords.map((record) => (
                  <div className="timeline-item" key={record.id}>
                    <span className="timeline-icon">
                      <FiClock />
                    </span>
                    <div>
                      <strong>{formatDate(record.date, "MMM dd")}</strong>
                      <p className="muted">
                        {formatTime(getRecordStart(record))} to {formatTime(getRecordEnd(record))}
                      </p>
                      <span className={`badge ${record.status}`}>{getStatusLabel(record.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
