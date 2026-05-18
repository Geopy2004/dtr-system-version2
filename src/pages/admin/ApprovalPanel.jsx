// AdminLeaveApproval.jsx
import { useState } from 'react';
import { format } from 'date-fns';

export default function AdminLeaveApproval({ requests = [], onApprove, onReject, isLoading = false }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getLeaveTypeLabel = (type) => {
    const types = {
      annual: 'Annual Leave',
      sick: 'Sick Leave',
      personal: 'Personal Leave',
      unpaid: 'Unpaid Leave',
      bereavement: 'Bereavement Leave',
    };
    return types[type] || type;
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleApprove = (request) => {
    if (window.confirm(`Approve leave request for ${request.user_name}?`)) {
      onApprove(request.id);
    }
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    if (rejectReason.trim()) {
      onReject(selectedRequest.id, rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedRequest(null);
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    total: requests.length,
  };

  return (
    <div className="p-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Requests</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="text-sm text-yellow-800">Pending</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.pending}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="text-sm text-green-800">Approved</div>
          <div className="text-2xl font-bold text-green-900">{stats.approved}</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 border-l-4 border-red-500">
          <div className="text-sm text-red-800">Rejected</div>
          <div className="text-2xl font-bold text-red-900">{stats.rejected}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 border-b">
        {['pending', 'approved', 'rejected', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 capitalize ${
              filter === tab
                ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{request.user_name}</div>
                        <div className="text-sm text-gray-500">{request.user_email}</div>
                        <div className="text-sm text-gray-500">{request.department}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getLeaveTypeLabel(request.leave_type)}</td>
                    <td className="px-6 py-4">
                      {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">{calculateDays(request.start_date, request.end_date)} days</td>
                    <td className="px-6 py-4">
                      <div className="max-w-xs truncate" title={request.reason}>
                        {request.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(request.status)}`}>
                        {request.status.toUpperCase()}
                      </span>
                      {request.rejection_reason && (
                        <div className="text-xs text-red-600 mt-1">Reason: {request.rejection_reason}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(request)}
                            disabled={isLoading}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request)}
                            disabled={isLoading}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {request.status === 'approved' && (
                        <span className="text-green-600 text-sm">✓ Approved</span>
                      )}
                      {request.status === 'rejected' && (
                        <span className="text-red-600 text-sm">✗ Rejected</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Reject Leave Request</h3>
            <p className="text-sm text-gray-600 mb-3">
              Rejecting request from <strong>{selectedRequest?.user_name}</strong>
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              rows="4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}