import { useState, useEffect, useCallback } from "react";
import { attendanceAPI } from "../../services/api";
import toast from "react-hot-toast";
import { format } from "date-fns";
import "./timeinout.css";

export default function TimeInOut() {
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [notes, setNotes] = useState("");

  // ─────────────────────────────
  // FETCH ATTENDANCE (STABLE FUNCTION)
  // ─────────────────────────────
  const fetchTodayAttendance = useCallback(async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");

      const result = await attendanceAPI.getMyAttendance({
        startDate: today,
        endDate: today,
      });

      console.log("FETCH RESULT:", result);

      const attendance =
        result?.attendance?.[0] || result?.data?.[0] || null;

      setTodayAttendance(attendance);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load attendance");
    }
  }, []);

  // ─────────────────────────────
  // INIT FETCH (FIXES ESLINT WARNING)
  // ─────────────────────────────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTodayAttendance();
  }, [fetchTodayAttendance]);

  // ─────────────────────────────
  // TIME IN
  // ─────────────────────────────
  const handleTimeIn = async () => {
    setLoading(true);

    try {
      await attendanceAPI.timeIn(notes);

      toast.success("Time in successful!");

      setNotes("");
      await fetchTodayAttendance();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Time in failed");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────
  // TIME OUT
  // ─────────────────────────────
  const handleTimeOut = async () => {
    setLoading(true);

    try {
      await attendanceAPI.timeOut();

      toast.success("Time out successful!");

      await fetchTodayAttendance();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Time out failed");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────
  // UI
  // ─────────────────────────────
  return (
    <div className="timeinout-container">
      <h3>Today's Attendance</h3>

      {todayAttendance ? (
        <div className="attendance-info">
          <p>
            Time In:{" "}
            {todayAttendance.time_in
              ? format(new Date(todayAttendance.time_in), "hh:mm:ss a")
              : "—"}
          </p>

          {todayAttendance.time_out && (
            <p>
              Time Out:{" "}
              {format(new Date(todayAttendance.time_out), "hh:mm:ss a")}
            </p>
          )}

          {todayAttendance.status === "late" && (
            <p className="late">
              Late by: {todayAttendance.late_minutes} minutes
            </p>
          )}
        </div>
      ) : (
        <p>No attendance record today</p>
      )}

      <div className="attendance-actions">
        {!todayAttendance && (
          <button
            onClick={handleTimeIn}
            disabled={loading}
            className="btn-timein"
          >
            {loading ? "Processing..." : "Time In"}
          </button>
        )}

        {todayAttendance && !todayAttendance.time_out && (
          <button
            onClick={handleTimeOut}
            disabled={loading}
            className="btn-timeout"
          >
            {loading ? "Processing..." : "Time Out"}
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