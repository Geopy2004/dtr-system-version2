import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  MdCheckCircle,
  MdNotificationAdd,
  MdNotificationsActive,
  MdOutlineNotificationsNone,
  MdSend,
} from "react-icons/md";
import AppShell from "../../components/common/AppShell";
import Loader from "../../components/common/loader";
import { notificationAPI, profileAPI, realtimeAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../utils/attendance";
import "./notifications.css";

const initialForm = {
  title: "",
  message: "",
  type: "info",
  audience: "all",
  userId: "",
};

export default function Notifications() {
  const { isAdmin, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState(initialForm);

  const loadNotifications = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setNotifications(
        isAdmin
          ? await notificationAPI.getAllNotifications()
          : await notificationAPI.getMyNotifications()
      );
    } catch (error) {
      setNotifications([]);
      toast.error(error?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!isAdmin) return undefined;

    let isMounted = true;

    profileAPI
      .getAllUsers()
      .then((items) => {
        if (!isMounted) return;
        setEmployees(
          (items || []).filter(
            (item) => item.role !== "admin" && item.is_active !== false
          )
        );
      })
      .catch((error) => {
        toast.error(error?.message || "Unable to load users.");
      });

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    try {
      return realtimeAPI.subscribeToTable("notifications", () =>
        loadNotifications({ silent: true })
      );
    } catch {
      return undefined;
    }
  }, [loadNotifications]);

  useEffect(() => {
    const refresh = () => loadNotifications({ silent: true });
    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.user_id === user?.id && !item.read_at).length,
    [notifications, user?.id]
  );

  const markRead = async (notification) => {
    if (!notification?.id || notification.user_id !== user?.id || notification.read_at) return;

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
    const unread = notifications.filter((item) => item.user_id === user?.id && !item.read_at);
    if (!unread.length) return;

    try {
      await Promise.all(unread.map((item) => notificationAPI.markRead(item.id)));
      const readAt = new Date().toISOString();
      const unreadIds = new Set(unread.map((item) => item.id));
      setNotifications((items) =>
        items.map((item) =>
          unreadIds.has(item.id) ? { ...item, read_at: item.read_at || readAt } : item
        )
      );
      toast.success("Notifications marked as read.");
    } catch (error) {
      toast.error(error?.message || "Unable to mark all read.");
    }
  };

  const createNotification = async (event) => {
    event.preventDefault();

    const userIds = form.audience === "single" ? [form.userId].filter(Boolean) : [];

    if (form.audience === "single" && !userIds.length) {
      toast.error("Choose at least one employee.");
      return;
    }

    try {
      setSending(true);
      const created = await notificationAPI.createNotification({
        title: form.title,
        message: form.message,
        type: form.type,
        audience: form.audience,
        user_ids: userIds,
      });
      setForm(initialForm);
      await loadNotifications();
      toast.success(
        form.audience === "all"
          ? "Notification posted for all employees."
          : created.length > 1
          ? `Notification sent to ${created.length} employees.`
          : "Notification sent."
      );
    } catch (error) {
      toast.error(error?.message || "Unable to send notification.");
    } finally {
      setSending(false);
    }
  };

  const updateForm = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "audience" && value === "all" ? { userId: "" } : {}),
    }));
  };

  return (
    <AppShell>
      <div className="page page-stack notifications-page">
        <header className="page-header">
          <div>
            <span className="eyebrow">Updates</span>
            <h1 className="page-title">Notifications</h1>
            <p className="page-subtitle">
              {isAdmin
                ? "Create employee alerts and review sent notifications"
                : unreadCount
                  ? `${unreadCount} unread notifications`
                  : "All caught up"}
            </p>
          </div>
          {!isAdmin && (
            <button
              className="ghost-btn"
              type="button"
              onClick={markAllRead}
              disabled={!unreadCount}
            >
              <MdCheckCircle />
              Mark all read
            </button>
          )}
        </header>

        {isAdmin && (
          <section className="notification-compose glass-card">
            <div className="notification-compose-heading">
              <MdNotificationAdd />
              <div>
                <h2>Create notification</h2>
                <p>Send an announcement to all employees or one selected user.</p>
              </div>
            </div>

            <form className="notification-form" onSubmit={createNotification}>
              <label className="field-control">
                <span>Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={updateForm("title")}
                  maxLength={140}
                  required
                  disabled={sending}
                />
              </label>

              <label className="field-control">
                <span>Type</span>
                <select value={form.type} onChange={updateForm("type")} disabled={sending}>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>

              <label className="field-control">
                <span>Audience</span>
                <select
                  value={form.audience}
                  onChange={updateForm("audience")}
                  disabled={sending}
                >
                  <option value="all">All employees</option>
                  <option value="single">Specific employee</option>
                </select>
              </label>

              {form.audience === "single" && (
                <label className="field-control">
                  <span>Employee</span>
                  <select
                    value={form.userId}
                    onChange={updateForm("userId")}
                    required
                    disabled={sending}
                  >
                    <option value="">Select employee</option>
                    {employees.map((employee) => (
                      <option value={employee.id} key={employee.id}>
                        {employee.full_name || employee.email}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="field-control notification-message-field">
                <span>Message</span>
                <textarea
                  value={form.message}
                  onChange={updateForm("message")}
                  maxLength={1200}
                  rows={4}
                  required
                  disabled={sending}
                />
              </label>

              <button className="primary-btn notification-send-btn" type="submit" disabled={sending}>
                <MdSend />
                {sending ? "Sending..." : "Send notification"}
              </button>
            </form>
          </section>
        )}

        {loading && <Loader mode="panel" label="Loading notifications" />}

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
                  {notification.user_id === user?.id && !notification.read_at && (
                    <span className="pill">Unread</span>
                  )}
                  {!notification.user_id && <span className="pill">Announcement</span>}
                </div>
                <p>{notification.message || notification.description || "New update available."}</p>
                <small>
                  {isAdmin && notification.profiles
                    ? `To ${notification.profiles.full_name || notification.profiles.email} - `
                    : ""}
                  {formatDate(notification.created_at, "MMM dd, yyyy hh:mm a")}
                </small>
              </div>
              {!isAdmin && notification.user_id === user?.id && (
                <button
                  className="ghost-btn"
                  type="button"
                  onClick={() => markRead(notification)}
                  disabled={Boolean(notification.read_at)}
                >
                  {notification.read_at ? "Read" : "Mark read"}
                </button>
              )}
            </article>
          ))}

          {!loading && !notifications.length && (
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
