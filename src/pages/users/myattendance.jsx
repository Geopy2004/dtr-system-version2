import { useState, useEffect } from 'react';
import { attendanceAPI } from '../../../services/api';
import { format } from 'date-fns';
import "./myattendance.css";
export default function MyAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    startDate: format(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      'yyyy-MM-dd'
    ),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // =========================
  // FETCH ATTENDANCE (SAFE EFFECT)
  // =========================
  useEffect(() => {
    const loadAttendance = async () => {
      setLoading(true);

      try {
        const result = await attendanceAPI.getMyAttendance(filters);
        setAttendance(result?.attendance || []);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAttendance();
  }, [filters]);

  // =========================
  // EXPORT CSV
  // =========================
  const exportToCSV = () => {
    const headers = [
      'Date',
      'Time In',
      'Time Out',
      'Status',
      'Late Minutes',
      'Overtime',
    ];

    const csvData = attendance.map((record) => [
      format(new Date(record.date), 'yyyy-MM-dd'),
      format(new Date(record.time_in), 'hh:mm:ss a'),
      record.time_out
        ? format(new Date(record.time_out), 'hh:mm:ss a')
        : '-',
      record.status,
      record.late_minutes,
      record.overtime,
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${filters.startDate}_to_${filters.endDate}.csv`;
    a.click();
  };

  // =========================
  // LOADING STATE
  // =========================
  if (loading) {
    return <div>Loading attendance records...</div>;
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="my-attendance">
      <h2>My Attendance Records</h2>

      {/* FILTERS */}
      <div className="filters">
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) =>
            setFilters({ ...filters, startDate: e.target.value })
          }
        />

        <span>to</span>

        <input
          type="date"
          value={filters.endDate}
          onChange={(e) =>
            setFilters({ ...filters, endDate: e.target.value })
          }
        />

        {/* triggers refetch via filters */}
        <button onClick={() => setFilters({ ...filters })}>
          Filter
        </button>

        <button onClick={exportToCSV}>Export CSV</button>
      </div>

      {/* TABLE */}
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Time In</th>
            <th>Time Out</th>
            <th>Status</th>
            <th>Late Minutes</th>
            <th>Overtime</th>
          </tr>
        </thead>

        <tbody>
          {attendance.map((record) => (
            <tr key={record.id}>
              <td>
                {format(new Date(record.date), 'MMM dd, yyyy')}
              </td>

              <td>
                {format(
                  new Date(record.time_in),
                  'hh:mm:ss a'
                )}
              </td>

              <td>
                {record.time_out
                  ? format(
                      new Date(record.time_out),
                      'hh:mm:ss a'
                    )
                  : '-'}
              </td>

              <td className={`status-${record.status}`}>
                {record.status}
              </td>

              <td>{record.late_minutes}</td>
              <td>{record.overtime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}