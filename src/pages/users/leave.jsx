import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiCalendar, FiCheckCircle, FiClock, FiFile, FiUpload } from "react-icons/fi";
import AppShell from "../../components/common/AppShell";
import { leaveAPI, realtimeAPI } from "../../services/api";
import { seedLeaves } from "../../data/platformSeed";
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
      console.warn("Leave preview data loaded:", error?.message);
      setLeaves(seedLeaves);
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
    return { balance: Math.max(0, 15 - approved - pending), approved, pending };
  }, [leaves]);

  const set = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
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
      <div className="page page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">Leave Workspace</span>
            <h1 className="page-title">Leave Requests</h1>
            <p className="page-subtitle">Balance: {summary.balance} days</p>
          </div>
        </header>

        <section className="metric-grid three">
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
        </section>

        <section className="split-grid">
          <form className="glass-card form-grid" onSubmit={handleSubmit}>
            <div className="card-title-row">
              <h2>New Request</h2>
              <FiFile />
            </div>

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

            <div className="form-two">
              <label className="field-control">
                <span>Start date</span>
                <input type="date" value={form.start_date} onChange={set("start_date")} />
              </label>
              <label className="field-control">
                <span>End date</span>
                <input type="date" value={form.end_date} onChange={set("end_date")} />
              </label>
            </div>

            <label className="field-control">
              <span>Total days</span>
              <input type="number" min="0.5" step="0.5" value={form.total_days} onChange={set("total_days")} />
            </label>

            <label className="field-control">
              <span>Reason</span>
              <textarea value={form.reason} onChange={set("reason")} rows="4" placeholder="Leave reason" />
            </label>

            <label className="upload-control">
              <FiUpload />
              <span>{file ? file.name : "Supporting document"}</span>
              <input type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            </label>

            <button className="primary-btn" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit request"}
            </button>
          </form>

          <div className="table-card">
            <div className="card-title-row">
              <h2>Leave History</h2>
              <span className="pill">{leaves.length} requests</span>
            </div>
            <div className="data-table-wrap">
              <table className="data-table">
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
                      <td>{leave.leave_type}</td>
                      <td>{formatDate(leave.start_date)} to {formatDate(leave.end_date)}</td>
                      <td>{leave.total_days}</td>
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
