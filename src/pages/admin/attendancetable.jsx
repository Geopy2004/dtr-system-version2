import { format, isValid } from 'date-fns';

export default function AttendanceTable({ attendance = [], isLoading = false }) {
  const formatDate = (dateValue, formatStr = 'yyyy-MM-dd') => {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    return isValid(date) ? format(date, formatStr) : '-';
  };

  const formatTime = (timeValue) => {
    if (!timeValue) return '-';
    const date = new Date(timeValue);
    return isValid(date) ? format(date, 'hh:mm a') : '-';
  };

  const getStatusBadgeColor = (status) => {
    const statusColors = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      late: 'bg-yellow-100 text-yellow-800',
      'half-day': 'bg-orange-100 text-orange-800',
      holiday: 'bg-blue-100 text-blue-800',
    };
    return statusColors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="table-container">
        <div className="text-center py-8 text-gray-500">Loading attendance records...</div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="data-table min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time In
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Out
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {attendance.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                  No attendance records found
                </td>
              </tr>
            ) : (
              attendance.map((item, index) => {
                const timeIn = formatTime(item.time_in);
                const timeOut = formatTime(item.time_out);
                
                // Calculate duration if both times exist
                let duration = '-';
                if (item.time_in && item.time_out) {
                  const start = new Date(item.time_in);
                  const end = new Date(item.time_out);
                  const diffHours = (end - start) / (1000 * 60 * 60);
                  duration = `${diffHours.toFixed(1)} hrs`;
                }

                return (
                  <tr 
                    key={item.id || index} 
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.profiles?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.profiles?.role || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.profiles?.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {timeIn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {timeOut}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(item.status)}`}>
                        {item.status || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {duration}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Optional: Add pagination info */}
      {attendance.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 text-right">
          Showing {attendance.length} record{attendance.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}