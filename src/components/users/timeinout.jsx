import { useState, useEffect } from 'react';
import { attendanceAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function TimeInOut() {
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [location, setLocation] = useState(null);
  const [notes, setNotes] = useState('');

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Location error:', error);
          toast.error('Unable to get location');
        }
      );
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const result = await attendanceAPI.getMyAttendance({
        startDate: today,
        endDate: today,
      });

      setTodayAttendance(result.attendance[0]);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await fetchTodayAttendance();
      getCurrentLocation();
    };

    initializeData();
  }, []);

  const handleTimeIn = async () => {
    if (!location) {
      toast.error('Location not available');
      return;
    }

    setLoading(true);

    try {
      await attendanceAPI.timeIn(location, notes);
      toast.success('Time in successful!');
      fetchTodayAttendance();
      setNotes('');
    } catch (error) {
      toast.error(error.message || 'Time in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeOut = async () => {
    setLoading(true);

    try {
      await attendanceAPI.timeOut();
      toast.success('Time out successful!');
      fetchTodayAttendance();
    } catch (error) {
      toast.error(error.message || 'Time out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="timeinout-container">
      <h3>Today's Attendance</h3>

      {todayAttendance && (
        <div className="attendance-info">
          <p>
            Time In:{' '}
            {format(new Date(todayAttendance.time_in), 'hh:mm:ss a')}
          </p>

          {todayAttendance.time_out && (
            <p>
              Time Out:{' '}
              {format(new Date(todayAttendance.time_out), 'hh:mm:ss a')}
            </p>
          )}

          {todayAttendance.status === 'late' && (
            <p className="late">
              Late by: {todayAttendance.late_minutes} minutes
            </p>
          )}
        </div>
      )}

      <div className="attendance-actions">
        {!todayAttendance && (
          <button
            onClick={handleTimeIn}
            disabled={loading}
            className="btn-timein"
          >
            {loading ? 'Processing...' : 'Time In'}
          </button>
        )}

        {todayAttendance && !todayAttendance.time_out && (
          <button
            onClick={handleTimeOut}
            disabled={loading}
            className="btn-timeout"
          >
            {loading ? 'Processing...' : 'Time Out'}
          </button>
        )}
      </div>

      {!todayAttendance && (
        <div className="notes-input">
          <textarea
            placeholder="Add notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="3"
          />
        </div>
      )}
    </div>
  );
}