import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  MdCheckCircle,
  MdNotificationsActive,
  MdOutlineNotificationsNone,
} from "react-icons/md";
import AppShell from "../../components/common/AppShell";
import { notificationAPI, realtimeAPI } from "../../services/api";
import { formatDate } from "../../utils/attendance";
import "./notifications.css";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setNotifications(await notificationAPI.getMyNotifications());
    } catch (error) {
      setNotifications([]);
      toast.error(error?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    try {
      return realtimeAPI.subscribeToTable("notifications", loadNotifications);
    } catch {
      return undefined;
    }
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read_at).length,
    [notifications]
  );

  const markRead = async (notification) => {
    if (!notification?.id || notification.read_at) return;

    try {
      await notificationAPI.markRead(notification.id);
      setNotifications((items) =>
        items.map((item) =>
          item.id === notification.id
            ? { ...item, read_at: new Date().toISOString() }
            : item
        )
      );
    } catch (error) {
      toast.error(error?.message || "Unable to mark notification read.");
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter((item) => !item.read_at);
    if (!unread.length) return;

    try {
      await Promise.all(unread.map((item) => notificationAPI.markRead(item.id)));
      const readAt = new Date().toISOString();
      setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || readAt })));
      toast.success("Notifications marked as read.");
    } catch (error) {
      toast.error(error?.message || "Unable to mark all read.");
    }
  };

  return (
    <AppShell>
      <div className="page page-stack notifications-page">
        <header className="page-header">
          <div>
            <span className="eyebrow">Updates</span>
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">
              {unreadCount ? `${unreadCount} unread notifications` : "All caught up"}
            </p>
          </div>
          <button
            className="ghost-btn"
            type="button"
            onClick={markAllRead}
            disabled={!unreadCount}
          >
            <MdCheckCircle />
            Mark all read
          </button>
        </header>

        <section className="notifications-list-page">
          {notifications.map((notification) => (
            <article
              className={`notification-card ${notification.read_at ? "" : "unread"}`}
              key={notification.id}
            >
              <div className="notification-icon">
                <MdNotificationsActive />
              </div>
              <div>
                <div className="notification-title-row">
                  <h2>
                    {notification.title ||
                      notification.action ||
                      notification.type ||
                      "Notification"}
                  </h2>
                  {!notification.read_at && <span className="pill">Unread</span>}
                </div>
                <p>{notification.message || notification.description || "New update available."}</p>
                <small>{formatDate(notification.created_at, "MMM dd, yyyy hh:mm a")}</small>
              </div>
              <button
                className="ghost-btn"
                type="button"
                onClick={() => markRead(notification)}
                disabled={Boolean(notification.read_at)}
              >
                {notification.read_at ? "Read" : "Mark read"}
              </button>
            </article>
          ))}

          {!notifications.length && (
            <div className="notification-empty-page table-card">
              <MdOutlineNotificationsNone />
              <strong>{loading ? "Loading notifications..." : "No notifications"}</strong>
              <p>New alerts and system updates will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
