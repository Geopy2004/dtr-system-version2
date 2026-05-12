import { useState, useEffect, useCallback } from "react";
import { attendanceAPI } from "../../services/api";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  FiCheckCircle,
  FiEdit3,
  FiInfo,
  FiLogIn,
  FiLogOut,
  FiMoreVertical,
  FiUser,
} from "react-icons/fi";
import "./timeinout.css";
import Loader from "../../components/common/Loader";

export default function TimeInOut({ onAttendanceUpdate }) {
  const [loading, setLoading] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchTodayAttendance = useCallback(async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const result = await attendanceAPI.getMyAttendance({
        startDate: today,
        endDate: today,
      });

      return result?.attendance?.[0] || result?.data?.[0] || null;
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load attendance");
      return null;
    }
  }, []);

  useEffect(() => {
    fetchTodayAttendance().then((attendance) => {
      setTodayAttendance(attendance);
      setInitialLoading(false);
    });
  }, [fetchTodayAttendance]);

  const getSessionTime = useCallback(
    (field, fallbackField) => todayAttendance?.[field] || todayAttendance?.[fallbackField],
    [todayAttendance]
  );

  const handleAttendanceAction = async (action, successMessage) => {
    setLoading(true);

    try {
      await action();

      toast.success(successMessage, {
        duration: 3000,
      });

      setNotes("");
      setShowNotes(false);
      setShowMenu(false);

      const updated = await fetchTodayAttendance();
      setTodayAttendance(updated);
      onAttendanceUpdate?.(updated);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Attendance action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleMorningIn = () =>
    handleAttendanceAction(
      () => attendanceAPI.morningIn("", notes),
      "Morning time in successful!"
    );

  const handleLunchOut = () =>
    handleAttendanceAction(attendanceAPI.lunchOut, "Lunch time out successful!");

  const handleLunchIn = () =>
    handleAttendanceAction(attendanceAPI.lunchIn, "Lunch time in successful!");

  const handleAfternoonOut = () =>
    handleAttendanceAction(
      attendanceAPI.afternoonOut,
      "Afternoon time out successful!"
    );

  const calculateDuration = () => {
    if (!todayAttendance?.time_in) return null;

    const timeIn = new Date(getSessionTime("morning_time_in", "time_in"));
    const endTime = getSessionTime("afternoon_time_out", "time_out");
    const timeOut = endTime ? new Date(endTime) : currentTime;
    const duration = Math.floor((timeOut - timeIn) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);

    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = () => {
    if (!todayAttendance) return "neutral";
    if (getSessionTime("afternoon_time_out", "time_out")) return "completed";
    if (todayAttendance.status === "late") return "late";
    return "present";
  };

  const morningIn = getSessionTime("morning_time_in", "time_in");
  const lunchOut = getSessionTime("lunch_time_out");
  const lunchIn = getSessionTime("lunch_time_in");
  const afternoonOut = getSessionTime("afternoon_time_out", "time_out");

  if (initialLoading) {
    return (
      <div className="timeinout-wrapper">
        <div className="timeinout-container">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="timeinout-wrapper">
      <div className={`timeinout-container status-${getStatusColor()}`}>
        <div className="timeinout-header">
          <div className="header-content">
            <span className="attendance-kicker">Today</span>
            <h3 className="header-title">Attendance Checkpoint</h3>
            <p className="current-time">{format(currentTime, "hh:mm:ss a")}</p>
          </div>
          <button
            className={`menu-btn ${showMenu ? "active" : ""}`}
            onClick={() => setShowMenu(!showMenu)}
            title="More options"
            type="button"
          >
            <FiMoreVertical />
          </button>
        </div>

        {showMenu && (
          <div className="quick-menu">
            <button
              className="menu-item clock-in"
              onClick={handleMorningIn}
              disabled={loading || todayAttendance}
              type="button"
            >
              <span className="menu-icon">
                <FiLogIn />
              </span>
              <span className="menu-text">Morning In</span>
            </button>
            <button
              className="menu-item clock-out"
              onClick={handleLunchOut}
              disabled={loading || !todayAttendance || lunchOut}
              type="button"
            >
              <span className="menu-icon">
                <FiLogOut />
              </span>
              <span className="menu-text">Lunch Out</span>
            </button>
            <button
              className="menu-item clock-in"
              onClick={handleLunchIn}
              disabled={loading || !lunchOut || lunchIn}
              type="button"
            >
              <span className="menu-icon">
                <FiLogIn />
              </span>
              <span className="menu-text">Lunch In</span>
            </button>
            <button
              className="menu-item clock-out"
              onClick={handleAfternoonOut}
              disabled={loading || !todayAttendance || (lunchOut && !lunchIn) || afternoonOut}
              type="button"
            >
              <span className="menu-icon">
                <FiLogOut />
              </span>
              <span className="menu-text">Afternoon Out</span>
            </button>
            <button
              className="menu-item notes"
              onClick={() => setShowNotes(!showNotes)}
              disabled={loading || todayAttendance}
              type="button"
            >
              <span className="menu-icon">
                <FiEdit3 />
              </span>
              <span className="menu-text">Add Notes</span>
            </button>
          </div>
        )}

        {todayAttendance ? (
          <div className="attendance-card">
            <div className="attendance-grid">
              <div className="attendance-item">
                <div className="item-label">Morning In</div>
                <div className="item-value">
                  {morningIn
                    ? format(new Date(morningIn), "hh:mm:ss a")
                    : "-"}
                </div>
              </div>

              <div className="attendance-item">
                <div className="item-label">Lunch Out</div>
                <div className="item-value">
                  {lunchOut
                    ? format(new Date(lunchOut), "hh:mm:ss a")
                    : "-"}
                </div>
              </div>

              <div className="attendance-item">
                <div className="item-label">Lunch In</div>
                <div className="item-value">
                  {lunchIn ? format(new Date(lunchIn), "hh:mm:ss a") : "-"}
                </div>
              </div>

              <div className="attendance-item">
                <div className="item-label">Afternoon Out</div>
                <div className="item-value">
                  {afternoonOut
                    ? format(new Date(afternoonOut), "hh:mm:ss a")
                    : "-"}
                </div>
              </div>

              {calculateDuration() && (
                <div className="attendance-item">
                  <div className="item-label">Duration</div>
                  <div className="item-value">{calculateDuration()}</div>
                </div>
              )}

              <div className="attendance-item">
                <div className="item-label">Status</div>
                <div className={`item-value status-${todayAttendance.status}`}>
                  {todayAttendance.status === "late" &&
                    `Late by ${todayAttendance.late_minutes || 0} min`}
                  {todayAttendance.status === "present" && "Present"}
                  {todayAttendance.status === "absent" && "Absent"}
                  {!todayAttendance.status && "Pending"}
                </div>
              </div>
            </div>

            {afternoonOut && (
              <div className="completion-badge">
                <FiCheckCircle />
                <span>Attendance Complete</span>
              </div>
            )}
          </div>
        ) : (
          <div className="no-attendance-card">
            <div className="no-attendance-icon">
              <FiUser />
            </div>
            <p className="no-attendance-text">No attendance record today</p>
            <p className="no-attendance-hint">Open actions to clock in</p>
          </div>
        )}

        {showNotes && !todayAttendance && (
          <div className="notes-section">
            <label htmlFor="notes" className="notes-label">
              Add Notes
            </label>
            <textarea
              id="notes"
              placeholder="Optional note for today's attendance"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows="3"
              disabled={loading}
              maxLength={500}
              className="notes-textarea"
            />
            <div className="notes-counter">{notes.length}/500</div>
          </div>
        )}

        <div className="attendance-actions">
          {!todayAttendance && (
            <button
              onClick={handleMorningIn}
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
                <>
                  <FiLogIn />
                  Morning In
                </>
              )}
            </button>
          )}

          {todayAttendance && !lunchOut && (
            <button
              onClick={handleLunchOut}
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
                <>
                  <FiLogOut />
                  Lunch Out
                </>
              )}
            </button>
          )}

          {lunchOut && !lunchIn && (
            <button
              onClick={handleLunchIn}
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
                <>
                  <FiLogIn />
                  Lunch In
                </>
              )}
            </button>
          )}

          {todayAttendance && !afternoonOut && (
            <button
              onClick={handleAfternoonOut}
              disabled={loading || (lunchOut && !lunchIn)}
              className="btn-timeout btn-danger"
              type="button"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                <>
                  <FiLogOut />
                  Afternoon Out
                </>
              )}
            </button>
          )}
        </div>

        <div className="timeinout-info">
          <p className="info-text">
            <FiInfo />
            Complete the day in order: morning in, lunch out, lunch in, afternoon out.
          </p>
        </div>
      </div>
    </div>
  );
}
