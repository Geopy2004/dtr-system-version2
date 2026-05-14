import { format } from 'date-fns';

export default function AttendanceTable({ attendance = [] }) {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Department</th>
            <th>Date</th>
            <th>Time In</th>
            <th>Time Out</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {attendance.length === 0 ? (
            <tr>
              <td colSpan="7">No attendance records</td>
            </tr>
          ) : (
            attendance.map((item) => (
              <tr key={item.id}>
                <td>{item.profiles?.name || '-'}</td>
                <td>{item.profiles?.role || '-'}</td>
                <td>{item.profiles?.department || '-'}</td>

                <td>
                  {item.date
                    ? format(new Date(item.date), 'yyyy-MM-dd')
                    : '-'}
                </td>

                <td>
                  {item.time_in
                    ? format(new Date(item.time_in), 'hh:mm a')
                    : '-'}
                </td>

                <td>
                  {item.time_out
                    ? format(new Date(item.time_out), 'hh:mm a')
                    : '-'}
                </td>

                <td>{item.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}