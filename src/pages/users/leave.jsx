import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFile,
  FiFileText,
  FiUpload,
  FiX,
} from "react-icons/fi";
import AppShell from "../../components/common/AppShell";
import { leaveAPI, realtimeAPI } from "../../services/api";
import { formatDate, getStatusLabel } from "../../utils/attendance";

const initialForm = {
  leave_type: "Vacation",
  start_date: "",
  end_date: "",
  total_days: 1,
  reason: "",
};

export default function LeavePortal() {
  const [leaves, setLeaves] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    try {
      setLeaves(await leaveAPI.getMyLeaves());
    } catch (error) {
      console.error("Unable to load leave requests from Supabase:", error);
      setLeaves([]);
      toast.error(error?.message || "Unable to load leave requests from Supabase.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(loadLeaves, 0);
    return () => window.clearTimeout(handle);
  }, [loadLeaves]);

  useEffect(() => realtimeAPI.subscribeToTable("leave_requests", loadLeaves), [loadLeaves]);

  const summary = useMemo(() => {
    const approved = leaves
      .filter((leave) => leave.status === "approved")
      .reduce((sum, leave) => sum + Number(leave.total_days || 0), 0);
    const pending = leaves
      .filter((leave) => leave.status === "pending")
      .reduce((sum, leave) => sum + Number(leave.total_days || 0), 0);
    const rejected = leaves.filter((leave) => leave.status === "rejected").length;
    const upcoming = leaves
      .filter((leave) => ["pending", "approved"].includes(leave.status))
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];
    return { balance: Math.max(0, 15 - approved - pending), approved, pending, rejected, upcoming };
  }, [leaves]);

  const set = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const setDate = (key) => (event) => {
    const value = event.target.value;
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (next.start_date && next.end_date) {
        const start = new Date(`${next.start_date}T00:00:00`);
        const end = new Date(`${next.end_date}T00:00:00`);
        if (end >= start) {
          next.total_days = Math.max(1, Math.round((end - start) / 86400000) + 1);
        }
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.start_date || !form.end_date || !form.reason.trim()) {
      toast.error("Complete the leave request.");
      return;
    }

    setSubmitting(true);
    try {
      await leaveAPI.submitRequest(form, file);
      toast.success("Leave request submitted.");
      setForm(initialForm);
      setFile(null);
      await loadLeaves();
    } catch (error) {
      toast.error(error?.message || "Unable to submit leave.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="page page-stack leave-page">
        <header className="page-header dashboard-hero leave-hero">
          <div>
            <span className="eyebrow">Leave Workspace</span>
            <h1 className="page-title">Leave Requests</h1>
            <p className="page-subtitle">
              Plan time off, attach supporting documents, and track review status in one place.
            </p>
          </div>
          <div className="leave-balance-panel">
            <span>Available</span>
            <strong>{summary.balance}</strong>
            <small>days remaining</small>
          </div>
        </header>

        <section className="leave-summary-grid">
          <article className="metric-card">
            <div className="metric-icon"><FiCalendar /></div>
            <div className="metric-value">{summary.balance}</div>
            <div className="metric-label">Available Days</div>
          </article>
          <article className="metric-card">
            <div className="metric-icon"><FiClock /></div>
            <div className="metric-value">{summary.pending}</div>
            <div className="metric-label">Pending Days</div>
          </article>
          <article className="metric-card">
            <div className="metric-icon"><FiCheckCircle /></div>
            <div className="metric-value">{summary.approved}</div>
            <div className="metric-label">Approved Days</div>
          </article>
          <article className="metric-card">
            <div className="metric-icon"><FiAlertCircle /></div>
            <div className="metric-value">{summary.rejected}</div>
            <div className="metric-label">Rejected Requests</div>
          </article>
        </section>

        <section className="leave-workspace-grid">
          <form className="glass-card leave-form-card" onSubmit={handleSubmit}>
            <div className="card-title-row leave-form-header">
              <div>
                <span className="eyebrow">Request Form</span>
                <h2>New leave request</h2>
              </div>
              <FiFile />
            </div>

            <div className="leave-form-scroll">
              <div className="leave-form-section">
                <label className="field-control">
                  <span>Leave type</span>
                  <select value={form.leave_type} onChange={set("leave_type")}>
                    <option>Vacation</option>
                    <option>Sick</option>
                    <option>Emergency</option>
                    <option>Bereavement</option>
                    <option>Unpaid</option>
                  </select>
                </label>

                <div className="leave-form-row">
                  <label className="field-control">
                    <span>Start date</span>
                    <input type="date" value={form.start_date} onChange={setDate("start_date")} />
                  </label>
                  <label className="field-control">
                    <span>End date</span>
                    <input
                      type="date"
                      value={form.end_date}
                      min={form.start_date || undefined}
                      onChange={setDate("end_date")}
                    />
                  </label>
                </div>

                <label className="field-control leave-total-days">
                  <span>Total days</span>
                  <input type="number" min="0.5" step="0.5" value={form.total_days} onChange={set("total_days")} />
                </label>
              </div>

              <label className="field-control">
                <span>Reason</span>
                <textarea value={form.reason} onChange={set("reason")} rows="5" placeholder="Leave reason" />
              </label>

              <div className="leave-upload-row">
                <label className="upload-control">
                  <FiUpload />
                  <span>{file ? file.name : "Supporting document"}</span>
                  <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                </label>
                {file && (
                  <button className="icon-btn" type="button" onClick={() => setFile(null)} aria-label="Remove document">
                    <FiX />
                  </button>
                )}
              </div>
            </div>

            <div className="leave-form-footer">
              <button className="primary-btn" type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit request"}
              </button>
            </div>
          </form>

          <div className="table-card leave-history-card">
            <div className="card-title-row">
              <div>
                <span className="eyebrow">History</span>
                <h2>Leave activity</h2>
              </div>
              <span className="pill">{leaves.length} requests</span>
            </div>
            <div className="leave-next-panel">
              <FiFileText />
              <div>
                <span>Next request</span>
                <strong>
                  {summary.upcoming
                    ? `${summary.upcoming.leave_type} - ${formatDate(summary.upcoming.start_date)}`
                    : "No pending or approved leave"}
                </strong>
              </div>
            </div>
            <div className="data-table-wrap">
              <table className="data-table leave-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Dates</th>
                    <th>Days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td>
                        <strong>{leave.leave_type}</strong>
                        {leave.reason && <small>{leave.reason}</small>}
                      </td>
                      <td>{formatDate(leave.start_date)} to {formatDate(leave.end_date)}</td>
                      <td>{Number(leave.total_days || 0).toLocaleString()}</td>
                      <td><span className={`badge ${leave.status}`}>{getStatusLabel(leave.status)}</span></td>
                    </tr>
                  ))}
                  {!leaves.length && (
                    <tr>
                      <td colSpan="4" className="empty-cell">
                        {loading ? "Loading leave requests..." : "No leave requests found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
