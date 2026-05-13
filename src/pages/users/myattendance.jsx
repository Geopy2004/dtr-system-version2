import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import toast from "react-hot-toast";
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiEye,
  FiFilter,
  FiPrinter,
  FiSearch,
  FiX,
} from "react-icons/fi";
import AppShell from "../../components/common/AppShell";
import TimeInOut from "./timeinout";
import { useAuth } from "../../context/AuthContext";
import {
  attendanceAPI,
  exportRowsToCsv,
  realtimeAPI,
} from "../../services/api";
import { seedAttendance } from "../../data/platformSeed";
import {
  buildDashboardStats,
  formatDate,
  formatTime,
  getRecordEnd,
  getRecordHours,
  getRecordStart,
  getStatusLabel,
  safeDate,
} from "../../utils/attendance";

const sameDate = (a, b) =>
  a && b && a.toISOString().split("T")[0] === b.toISOString().split("T")[0];

const buildCalendarDays = (month, records) => {
  const first = startOfMonth(month);
  const last = endOfMonth(month);
  const days = [];
  const startPadding = first.getDay();

  for (let index = 0; index < startPadding; index += 1) {
    days.push({ key: `pad-${index}`, empty: true });
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const record = records.find((item) => sameDate(safeDate(item.date), date));
    days.push({ key: date.toISOString(), date, record });
  }

  return days;
};

export default function MyAttendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date());
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const result = await attendanceAPI.getMyAttendance({
        startDate: format(startOfMonth(month), "yyyy-MM-dd"),
        endDate: format(endOfMonth(month), "yyyy-MM-dd"),
      });
      setRecords(result.attendance || []);
    } catch (error) {
      console.warn("Attendance preview data loaded:", error?.message);
      setRecords(seedAttendance);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    const handle = window.setTimeout(loadAttendance, 0);
    return () => window.clearTimeout(handle);
  }, [loadAttendance]);

  useEffect(() => {
    if (!user?.id) return undefined;
    return realtimeAPI.subscribeToAttendance(loadAttendance, `user_id=eq.${user.id}`);
  }, [loadAttendance, user?.id]);

  const stats = useMemo(() => buildDashboardStats(records, month), [month, records]);
  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
      const matchesStatus = status === "all" || record.status === status;
      const matchesSearch =
        !term ||
        formatDate(record.date).toLowerCase().includes(term) ||
        getStatusLabel(record.status).toLowerCase().includes(term) ||
        (record.notes || "").toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [records, search, status]);
  const calendarDays = useMemo(() => buildCalendarDays(month, records), [month, records]);

  const exportAttendance = () => {
    exportRowsToCsv(`my-dtr-${format(month, "yyyy-MM")}.csv`, filteredRecords, [
      { label: "Date", value: (row) => formatDate(row.date, "yyyy-MM-dd") },
      { label: "Time In", value: (row) => formatTime(getRecordStart(row)) },
      { label: "Break Out", value: (row) => formatTime(row.lunch_time_out) },
      { label: "Break In", value: (row) => formatTime(row.lunch_time_in) },
      { label: "Time Out", value: (row) => formatTime(getRecordEnd(row)) },
      { label: "Hours", value: (row) => getRecordHours(row).toFixed(2) },
      { label: "Late Minutes", value: "late_minutes" },
      { label: "Status", value: "status" },
      { label: "Notes", value: "notes" },
    ]);
    toast.success("Attendance exported.");
  };

  const metricCards = [
    { label: "Working Days", value: stats.workingDays },
    { label: "Present", value: stats.present },
    { label: "Late", value: stats.late },
    { label: "Absent", value: stats.absent },
    { label: "Worked Hours", value: `${stats.totalWorkedHours}h` },
    { label: "Attendance", value: `${stats.attendancePercentage}%` },
  ];

  return (
    <AppShell>
      <div className="page page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">Employee Time Record</span>
            <h1 className="page-title">My Attendance</h1>
            <p className="page-subtitle">
              {format(month, "MMMM yyyy")} daily time record.
            </p>
          </div>
          <div className="header-actions">
            <button className="ghost-btn" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <FiChevronLeft />
              Previous
            </button>
            <span className="pill">{format(month, "MMMM yyyy")}</span>
            <button className="ghost-btn" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              Next
              <FiChevronRight />
            </button>
          </div>
        </header>

        <section className="attendance-workflow-grid">
          <TimeInOut onAttendanceUpdate={loadAttendance} />

          <div className="glass-card">
            <div className="card-title-row">
              <h2>Month Summary</h2>
              <FiCalendar />
            </div>
            <div className="mini-metric-grid">
              {metricCards.map((metric) => (
                <div className="mini-metric" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{loading ? <i className="skeleton mini-skeleton" /> : metric.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="calendar-card glass-card">
          <div className="card-title-row">
            <div>
              <span className="eyebrow">Calendar View</span>
              <h2>Status by day</h2>
            </div>
            <span className="pill">{records.length} records</span>
          </div>
          <div className="calendar-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <strong className="calendar-heading" key={day}>{day}</strong>
            ))}
            {calendarDays.map((day) =>
              day.empty ? (
                <span className="calendar-day empty" key={day.key} />
              ) : (
                <button
                  className={`calendar-day ${day.record?.status || ""}`}
                  key={day.key}
                  type="button"
                  onClick={() => day.record && setSelectedRecord(day.record)}
                  disabled={!day.record}
                  title={day.record ? getStatusLabel(day.record.status) : "No record"}
                >
                  <span>{format(day.date, "d")}</span>
                  {day.record && <i />}
                </button>
              )
            )}
          </div>
        </section>

        <section className="table-card">
          <div className="toolbar-card table-toolbar">
            <div className="toolbar-search">
              <FiSearch />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search date, status, or notes"
              />
            </div>
            <div className="toolbar-actions">
              <label className="select-control">
                <FiFilter />
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="undertime">Undertime</option>
                  <option value="overtime">Overtime</option>
                </select>
              </label>
              <button className="ghost-btn" type="button" onClick={exportAttendance} disabled={!filteredRecords.length}>
                <FiDownload />
                Export
              </button>
              <button className="ghost-btn" type="button" onClick={() => window.print()}>
                <FiPrinter />
                Print
              </button>
            </div>
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Break Out</th>
                  <th>Break In</th>
                  <th>Time Out</th>
                  <th>Hours</th>
                  <th>Late</th>
                  <th>Status</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td>{formatTime(getRecordStart(record))}</td>
                    <td>{formatTime(record.lunch_time_out)}</td>
                    <td>{formatTime(record.lunch_time_in)}</td>
                    <td>{formatTime(getRecordEnd(record))}</td>
                    <td>{getRecordHours(record).toFixed(2)}h</td>
                    <td>{record.late_minutes || 0}m</td>
                    <td><span className={`badge ${record.status}`}>{getStatusLabel(record.status)}</span></td>
                    <td>
                      <button className="icon-btn" type="button" onClick={() => setSelectedRecord(record)} aria-label="View record">
                        <FiEye />
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredRecords.length && (
                  <tr>
                    <td colSpan="9" className="empty-cell">
                      {loading ? "Loading attendance..." : "No attendance records found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedRecord && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedRecord(null)}>
          <section className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="card-title-row">
              <div>
                <span className="eyebrow">Attendance Detail</span>
                <h2>{formatDate(selectedRecord.date, "MMMM dd, yyyy")}</h2>
              </div>
              <button className="icon-btn" type="button" onClick={() => setSelectedRecord(null)} aria-label="Close">
                <FiX />
              </button>
            </div>
            <div className="detail-grid">
              <div><span>Time In</span><strong>{formatTime(getRecordStart(selectedRecord))}</strong></div>
              <div><span>Break Out</span><strong>{formatTime(selectedRecord.lunch_time_out)}</strong></div>
              <div><span>Break In</span><strong>{formatTime(selectedRecord.lunch_time_in)}</strong></div>
              <div><span>Time Out</span><strong>{formatTime(getRecordEnd(selectedRecord))}</strong></div>
              <div><span>Worked Hours</span><strong>{getRecordHours(selectedRecord).toFixed(2)}h</strong></div>
              <div><span>Status</span><strong>{getStatusLabel(selectedRecord.status)}</strong></div>
            </div>
            <div className="notes-panel">
              <span>Notes</span>
              <p>{selectedRecord.notes || "No notes recorded."}</p>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
