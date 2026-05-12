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

  const handleTimeIn = async () => {
    setLoading(true);

    try {
      await attendanceAPI.timeIn("", notes);

      toast.success("Time in successful!", {
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
      toast.error(error?.message || "Time in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTimeOut = async () => {
    setLoading(true);

    try {
      await attendanceAPI.timeOut();

      toast.success("Time out successful!", {
        duration: 3000,
      });

      setShowMenu(false);

      const updated = await fetchTodayAttendance();
      setTodayAttendance(updated);
      onAttendanceUpdate?.(updated);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Time out failed");
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusColor = () => {
    if (!todayAttendance) return "neutral";
    if (todayAttendance.time_out) return "completed";
    if (todayAttendance.status === "late") return "late";
    return "present";
  };

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
              onClick={handleTimeIn}
              disabled={loading || todayAttendance}
              type="button"
            >
              <span className="menu-icon">
                <FiLogIn />
              </span>
              <span className="menu-text">Clock In</span>
            </button>
            <button
              className="menu-item clock-out"
              onClick={handleTimeOut}
              disabled={loading || !todayAttendance || todayAttendance.time_out}
              type="button"
            >
              <span className="menu-icon">
                <FiLogOut />
              </span>
              <span className="menu-text">Clock Out</span>
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
                <div className="item-label">Time In</div>
                <div className="item-value">
                  {todayAttendance.time_in
                    ? format(new Date(todayAttendance.time_in), "hh:mm:ss a")
                    : "-"}
                </div>
              </div>

              <div className="attendance-item">
                <div className="item-label">Time Out</div>
                <div className="item-value">
                  {todayAttendance.time_out
                    ? format(new Date(todayAttendance.time_out), "hh:mm:ss a")
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

            {todayAttendance.time_out && (
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
                <>
                  <FiLogIn />
                  Time In
                </>
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
                <>
                  <FiLogOut />
                  Time Out
                </>
              )}
            </button>
          )}
        </div>

        <div className="timeinout-info">
          <p className="info-text">
            <FiInfo />
            Keep one complete record per workday.
          </p>
        </div>
      </div>
    </div>
  );
}
