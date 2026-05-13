import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiActivity,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiFilter,
  FiMonitor,
  FiSearch,
} from "react-icons/fi";
import AppShell from "../../components/common/AppShell";
import {
  exportRowsToCsv,
  getBrowserDevice,
  logAPI,
  realtimeAPI,
} from "../../services/api";
import { seedLogs } from "../../data/platformSeed";
import { formatDate, getStatusLabel } from "../../utils/attendance";

const pageSize = 8;

export default function MyLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await logAPI.getMyLogs();
      setLogs(data);
    } catch (error) {
      console.warn("Logs preview data loaded:", error?.message);
      setLogs(seedLogs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(loadLogs, 0);
    return () => window.clearTimeout(handle);
  }, [loadLogs]);

  useEffect(() => {
    const unsubscribeActivity = realtimeAPI.subscribeToTable("activity_logs", loadLogs);
    const unsubscribeAttendance = realtimeAPI.subscribeToTable("attendance_logs", loadLogs);
    return () => {
      unsubscribeActivity();
      unsubscribeAttendance();
    };
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesFilter = filter === "all" || log.status === filter || log.log_type === filter;
      const text = `${log.action || ""} ${log.description || ""} ${log.device || ""}`.toLowerCase();
      return matchesFilter && (!term || text.includes(term));
    });
  }, [filter, logs, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const pageLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  const exportLogs = () => {
    exportRowsToCsv("my-activity-logs.csv", filteredLogs, [
      { label: "Action", value: "action" },
      { label: "Status", value: "status" },
      { label: "Timestamp", value: (row) => formatDate(row.timestamp || row.created_at, "yyyy-MM-dd hh:mm a") },
      { label: "Device", value: "device" },
      { label: "Details", value: "description" },
    ]);
    toast.success("Logs exported.");
  };

  return (
    <AppShell>
      <div className="page page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">Activity Timeline</span>
            <h1 className="page-title">My Logs</h1>
            <p className="page-subtitle">Current device: {getBrowserDevice()}</p>
          </div>
          <button className="primary-btn" type="button" onClick={exportLogs} disabled={!filteredLogs.length}>
            <FiDownload />
            Export
          </button>
        </header>

        <section className="toolbar-card">
          <div className="toolbar-search">
            <FiSearch />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search logs"
              />
          </div>
          <label className="select-control">
            <FiFilter />
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Logs</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="attendance">Attendance</option>
              <option value="activity">System</option>
            </select>
          </label>
        </section>

        <section className="logs-grid">
          <div className="glass-card">
            <div className="card-title-row">
              <div>
                <span className="eyebrow">Event Stream</span>
                <h2>Timeline</h2>
              </div>
              <span className="pill">{filteredLogs.length} events</span>
            </div>
            <div className="timeline rich">
              {pageLogs.map((log) => (
                <article className="timeline-item" key={log.id}>
                  <span className="timeline-icon">
                    <FiActivity />
                  </span>
                  <div>
                    <div className="timeline-title-row">
                      <strong>{(log.action || "activity").replaceAll(".", " ")}</strong>
                      <span className={`badge ${log.status || "success"}`}>
                        {getStatusLabel(log.status || "success")}
                      </span>
                    </div>
                    <p className="muted">{log.description || log.details || "Activity recorded"}</p>
                    <small>
                      {formatDate(log.timestamp || log.created_at, "MMM dd, yyyy hh:mm a")}
                    </small>
                  </div>
                </article>
              ))}
              {!pageLogs.length && (
                <div className="empty-state">
                  {loading ? "Loading logs..." : "No logs found."}
                </div>
              )}
            </div>
          </div>

          <div className="table-card">
            <div className="card-title-row">
              <h2>Device and Login History</h2>
              <FiMonitor />
            </div>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Device</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {pageLogs.map((log) => (
                    <tr key={`${log.id}-row`}>
                      <td>{(log.action || "activity").replaceAll(".", " ")}</td>
                      <td><span className={`badge ${log.status || "success"}`}>{getStatusLabel(log.status || "success")}</span></td>
                      <td>{formatDate(log.timestamp || log.created_at, "MMM dd, hh:mm a")}</td>
                      <td>{log.device || "Browser"}</td>
                      <td>{log.description || log.details || "-"}</td>
                    </tr>
                  ))}
                  {!pageLogs.length && (
                    <tr>
                      <td colSpan="5" className="empty-cell">
                        {loading ? "Loading logs..." : "No logs found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination-row">
              <button className="ghost-btn" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>
                <FiChevronLeft />
                Previous
              </button>
              <span className="pill">Page {page} of {totalPages}</span>
              <button className="ghost-btn" type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages}>
                Next
                <FiChevronRight />
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
