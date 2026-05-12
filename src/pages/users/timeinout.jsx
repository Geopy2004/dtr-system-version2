import { useState, useEffect, useCallback } from "react";
import { attendanceAPI } from "../../services/api";
import toast from "react-hot-toast";
import { format } from "date-fns";
import "./timeinout.css";
import Sidebar from "../../components/common/Sidebar";
import Loader from "../../components/common/Loader";

/**
 * TimeInOut Component
 * 
 * Allows users to:
 * - Clock in with optional notes
 * - Clock out
 * - View today's attendance status
 * - Quick actions menu
 * 
 * Props:
 * - onAttendanceUpdate: Callback when time in/out changes
 */
export default function TimeInOut({ onAttendanceUpdate }) {
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [initialLoading, setInitialLoading] = useState(true);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─────────────────────────────
  // FETCH TODAY'S ATTENDANCE
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

      return attendance;
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load attendance");
      return null;
    }
  }, []);

  // ─────────────────────────────
  // LOAD ATTENDANCE ON MOUNT
  // ─────────────────────────────
  useEffect(() => {
    fetchTodayAttendance()
      .then((attendance) => {
        setTodayAttendance(attendance);
        setInitialLoading(false);
      });
  }, [fetchTodayAttendance]);

  // ─────────────────────────────
  // TIME IN
  // ─────────────────────────────
  const handleTimeIn = async () => {
    setLoading(true);

    try {
      await attendanceAPI.timeIn("", notes);

      toast.success("✓ Time in successful!", {
        icon: "✓",
        duration: 3000,
      });

      setNotes("");
      setShowNotes(false);
      setShowMenu(false);
      
      const updated = await fetchTodayAttendance();
      setTodayAttendance(updated);

      // Notify parent component
      if (onAttendanceUpdate) {
        onAttendanceUpdate(updated);
      }
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

      toast.success("✓ Time out successful!", {
        icon: "✓",
        duration: 3000,
      });

      setShowMenu(false);
      
      const updated = await fetchTodayAttendance();
      setTodayAttendance(updated);

      // Notify parent component
      if (onAttendanceUpdate) {
        onAttendanceUpdate(updated);
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Time out failed");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────
  // CALCULATE DURATION
  // ─────────────────────────────
  const calculateDuration = () => {
    if (!todayAttendance?.time_in) return null;
    
    const timeIn = new Date(todayAttendance.time_in);
    const timeOut = todayAttendance.time_out 
      ? new Date(todayAttendance.time_out) 
      : currentTime;
    
    const duration = Math.floor((timeOut - timeIn) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    
    return `${hours}h ${minutes}m`;
  };

  // ─────────────────────────────
  // GET STATUS COLOR
  // ─────────────────────────────
  const getStatusColor = () => {
    if (!todayAttendance) return "neutral";
    if (todayAttendance.time_out) return "completed";
    if (todayAttendance.status === "late") return "late";
    return "present";
  };

  // Show loader while fetching initial data
  if (initialLoading) {
    return (
      <>
        <Sidebar />
        <div className="timeinout-wrapper">
          <div className="timeinout-container">
            <Loader />
          </div>
        </div>
      </>
    );
  }

  // ─────────────────────────────
  // RENDER
  // ─────────────────────────────
  return (
    <>
      <Sidebar />
      <div className="timeinout-wrapper">
        <div className={`timeinout-container status-${getStatusColor()}`}>
          {/* Header */}
          <div className="timeinout-header">
            <div className="header-content">
              <h3 className="header-title">⏰ Today's Attendance</h3>
              <p className="current-time">{format(currentTime, "hh:mm:ss a")}</p>
            </div>
            <button 
              className={`menu-btn ${showMenu ? "active" : ""}`}
              onClick={() => setShowMenu(!showMenu)}
              title="More options"
            >
              ⋮
            </button>
          </div>

          {/* Quick Menu */}
          {showMenu && (
            <div className="quick-menu">
              <button 
                className="menu-item clock-in"
                onClick={handleTimeIn}
                disabled={loading || todayAttendance}
              >
                <span className="menu-icon">🔓</span>
                <span className="menu-text">Clock In</span>
              </button>
              <button 
                className="menu-item clock-out"
                onClick={handleTimeOut}
                disabled={loading || !todayAttendance || todayAttendance.time_out}
              >
                <span className="menu-icon">🔒</span>
                <span className="menu-text">Clock Out</span>
              </button>
              <button 
                className="menu-item notes"
                onClick={() => setShowNotes(!showNotes)}
                disabled={loading || todayAttendance}
              >
                <span className="menu-icon">📝</span>
                <span className="menu-text">Add Notes</span>
              </button>
            </div>
          )}

          {/* Attendance Status Card */}
          {todayAttendance ? (
            <div className="attendance-card">
              <div className="attendance-grid">
                {/* Time In */}
                <div className="attendance-item">
                  <div className="item-label">📍 Time In</div>
                  <div className="item-value">
                    {todayAttendance.time_in
                      ? format(new Date(todayAttendance.time_in), "hh:mm:ss a")
                      : "—"}
                  </div>
                </div>

                {/* Time Out */}
                <div className="attendance-item">
                  <div className="item-label">📤 Time Out</div>
                  <div className="item-value">
                    {todayAttendance.time_out
                      ? format(new Date(todayAttendance.time_out), "hh:mm:ss a")
                      : "—"}
                  </div>
                </div>

                {/* Duration */}
                {calculateDuration() && (
                  <div className="attendance-item">
                    <div className="item-label">⏱️ Duration</div>
                    <div className="item-value">{calculateDuration()}</div>
                  </div>
                )}

                {/* Status */}
                <div className="attendance-item">
                  <div className="item-label">📊 Status</div>
                  <div className={`item-value status-${todayAttendance.status}`}>
                    {todayAttendance.status === "late" && (
                      <>Late by {todayAttendance.late_minutes} min</>
                    )}
                    {todayAttendance.status === "present" && "Present"}
                    {todayAttendance.status === "absent" && "Absent"}
                    {!todayAttendance.status && "Pending"}
                  </div>
                </div>
              </div>

              {/* Attendance Complete Badge */}
              {todayAttendance.time_out && (
                <div className="completion-badge">
                  <span className="badge-icon">✓</span>
                  <span className="badge-text">Attendance Complete</span>
                </div>
              )}
            </div>
          ) : (
            <div className="no-attendance-card">
              <div className="no-attendance-icon">👤</div>
              <p className="no-attendance-text">No attendance record today</p>
              <p className="no-attendance-hint">Click the menu to clock in</p>
            </div>
          )}

          {/* Notes Section */}
          {showNotes && !todayAttendance && (
            <div className="notes-section">
              <label htmlFor="notes" className="notes-label">
                📝 Add Notes (Optional)
              </label>
              <textarea
                id="notes"
                placeholder="Enter any additional notes about your attendance..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="3"
                disabled={loading}
                maxLength={500}
                className="notes-textarea"
              />
              <div className="notes-counter">
                {notes.length}/500
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="attendance-actions">
            {!todayAttendance && (
              <button
                onClick={handleTimeIn}
                disabled={loading}
                className="btn-timein btn-primary"
                type="button"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>🔓 Time In</>
                )}
              </button>
            )}

            {todayAttendance && !todayAttendance.time_out && (
              <button
                onClick={handleTimeOut}
                disabled={loading}
                className="btn-timeout btn-danger"
                type="button"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>🔒 Time Out</>
                )}
              </button>
            )}
          </div>

          {/* Info Message */}
          <div className="timeinout-info">
            <p className="info-text">
              ℹ️ Make sure to clock in when you arrive and clock out when you leave
            </p>
          </div>
        </div>
      </div>
    </>
  );
}