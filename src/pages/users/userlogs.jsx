import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import "./userlogs.css";
import Sidebar from "../../components/common/Sidebar";

export default function MyLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchUserLogs = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      const response = await fetch(`/api/logs/user/${user?.id}`);
      const data = await response.json();
      setLogs(data || []);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      // Mock data for development
      setLogs(generateMockLogs());
    } finally {
      setLoading(false);
    }
  };

  const generateMockLogs = () => [
    {
      id: 1,
      action: "Clock In",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      status: "success",
      details: "Morning check-in",
    },
    {
      id: 2,
      action: "Clock Out",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 8 * 60 * 60 * 1000),
      status: "success",
      details: "End of shift",
    },
    {
      id: 3,
      action: "Clock In",
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: "success",
      details: "Morning check-in",
    },
    {
      id: 4,
      action: "Leave Request",
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      status: "pending",
      details: "Half-day leave",
    },
    {
      id: 5,
      action: "Clock In",
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      status: "success",
      details: "Morning check-in",
    },
  ];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUserLogs();
  }, [user?.id]);

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === "all" || log.status === filter;
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="logs-container">
          <div className="loading">Loading your logs...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="logs-container">
        <div className="logs-header">
          <h1>My Activity Logs</h1>
          <p>View all your attendance and system activity</p>
        </div>

        <div className="logs-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All Logs
            </button>
            <button
              className={`filter-btn ${filter === "success" ? "active" : ""}`}
              onClick={() => setFilter("success")}
            >
              Success
            </button>
            <button
              className={`filter-btn ${filter === "pending" ? "active" : ""}`}
              onClick={() => setFilter("pending")}
            >
              Pending
            </button>
            <button
              className={`filter-btn ${filter === "failed" ? "active" : ""}`}
              onClick={() => setFilter("failed")}
            >
              Failed
            </button>
          </div>
        </div>

        <div className="logs-table-wrapper">
          {filteredLogs.length > 0 ? (
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className={`log-row ${log.status}`}>
                    <td className="action-cell">
                      <span className="action-badge">{log.action}</span>
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge ${log.status}`}>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                    </td>
                    <td className="timestamp-cell">
                      {log.timestamp.toLocaleString()}
                    </td>
                    <td className="details-cell">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-logs">
              <p>No logs found matching your criteria</p>
            </div>
          )}
        </div>

        <div className="logs-footer">
          <p>Total Logs: <strong>{filteredLogs.length}</strong></p>
        </div>
      </div>
    </>
  );
}