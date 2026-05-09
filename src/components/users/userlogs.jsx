import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

export default function UserLogs() {
  const { isAdmin, user } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    action: '',
    startDate: '',
    endDate: '',
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchLogs = async () => {
    setLoading(true);

    try {
      let result;

      if (isAdmin) {
        result = await adminAPI.getUserLogs(filters);
      } else {
        const { supabase } = await import('../../services/supabase');

        const { data } = await supabase
          .from('user_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false });

        result = { logs: data };
      }

      setLogs(result.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadLogs = async () => {
      await fetchLogs();
    };

    loadLogs();
  }, [fetchLogs, filters]);

  const getActionBadge = (action) => {
    const badges = {
      login: 'badge-success',
      logout: 'badge-info',
      time_in: 'badge-primary',
      time_out: 'badge-warning',
      profile_update: 'badge-secondary',
    };

    return badges[action] || 'badge-default';
  };

  if (loading) {
    return <div>Loading logs...</div>;
  }

  return (
    <div className="user-logs">
      <h2>Activity Logs</h2>

      {isAdmin && (
        <div className="filters">
          <select
            value={filters.action}
            onChange={(e) =>
              setFilters({
                ...filters,
                action: e.target.value,
              })
            }
          >
            <option value="">All Actions</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="time_in">Time In</option>
            <option value="time_out">Time Out</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({
                ...filters,
                startDate: e.target.value,
              })
            }
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({
                ...filters,
                endDate: e.target.value,
              })
            }
          />
        </div>
      )}

      <div className="logs-table">
        <table>
          <thead>
            <tr>
              {isAdmin && <th>User</th>}
              <th>Action</th>
              <th>Time</th>
              <th>Details</th>
            </tr>
          </thead>

          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id}>
                  {isAdmin && (
                    <td>{log.profiles?.name || log.user_id}</td>
                  )}

                  <td>
                    <span
                      className={`badge ${getActionBadge(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </td>

                  <td>
                    {format(
                      new Date(log.timestamp),
                      'MMM dd, yyyy hh:mm:ss a'
                    )}
                  </td>

                  <td>
                    {log.details ? (
                      Object.entries(log.details).map(
                        ([key, value]) => (
                          <div key={key}>
                            <strong>{key}:</strong> {String(value)}
                          </div>
                        )
                      )
                    ) : (
                      <span>No details</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? 4 : 3}>
                  No logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}