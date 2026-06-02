import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  MdCheckCircle,
  MdClose,
  MdDelete,
  MdEdit,
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
  const [deletingId, setDeletingId] = useState(null);
  const [editingNotification, setEditingNotification] = useState(null);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
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

  useEffect(() => {
    if (!notificationToDelete) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !deletingId) {
        setNotificationToDelete(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deletingId, notificationToDelete]);

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

  const saveNotification = async (event) => {
    event.preventDefault();

    const userIds = form.audience === "single" ? [form.userId].filter(Boolean) : [];

    if (!editingNotification && form.audience === "single" && !userIds.length) {
      toast.error("Choose at least one employee.");
      return;
    }

    try {
      setSending(true);
      let created = [];

      if (editingNotification) {
        await notificationAPI.updateNotification(editingNotification.id, {
          title: form.title,
          message: form.message,
          type: form.type,
        });
        setEditingNotification(null);
      } else {
        created = await notificationAPI.createNotification({
          title: form.title,
          message: form.message,
          type: form.type,
          audience: form.audience,
          user_ids: userIds,
        });
      }

      setForm(initialForm);
      await loadNotifications();
      toast.success(
        editingNotification
          ? "Notification updated."
          : form.audience === "all"
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

  const beginEdit = (notification) => {
    setEditingNotification(notification);
    setForm({
      title: notification.title || "",
      message: notification.message || notification.description || "",
      type: notification.type || "info",
      audience: notification.user_id ? "single" : "all",
      userId: notification.user_id || "",
    });
  };

  const cancelEdit = () => {
    setEditingNotification(null);
    setForm(initialForm);
  };

  const requestDeleteNotification = (notification) => {
    setNotificationToDelete(notification);
  };

  const deleteNotification = async () => {
    if (!notificationToDelete?.id) return;

    const notificationId = notificationToDelete.id;
    try {
      setDeletingId(notificationId);
      await notificationAPI.deleteNotification(notificationId);
      setNotifications((items) => items.filter((item) => item.id !== notificationId));
      if (editingNotification?.id === notificationId) cancelEdit();
      setNotificationToDelete(null);
      toast.success("Notification deleted.");
    } catch (error) {
      toast.error(error?.message || "Unable to delete notification.");
    } finally {
      setDeletingId(null);
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
                <h2>{editingNotification ? "Edit notification" : "Create notification"}</h2>
                <p>
                  {editingNotification
                    ? "Update the selected alert title, type, or message."
                    : "Send an announcement to all employees or one selected user."}
                </p>
              </div>
            </div>

            <form className="notification-form" onSubmit={saveNotification}>
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
                  disabled={sending || Boolean(editingNotification)}
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
                    disabled={sending || Boolean(editingNotification)}
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
                {sending
                  ? editingNotification
                    ? "Saving..."
                    : "Sending..."
                  : editingNotification
                  ? "Save changes"
                  : "Send notification"}
              </button>
              {editingNotification && (
                <button
                  className="ghost-btn notification-cancel-btn"
                  type="button"
                  onClick={cancelEdit}
                  disabled={sending}
                >
                  <MdClose />
                  Cancel
                </button>
              )}
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
              {isAdmin && (
                <div className="notification-actions">
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() => beginEdit(notification)}
                    disabled={sending || deletingId === notification.id}
                  >
                    <MdEdit />
                    Edit
                  </button>
                  <button
                    className="ghost-btn danger-btn"
                    type="button"
                    onClick={() => requestDeleteNotification(notification)}
                    disabled={sending || deletingId === notification.id}
                  >
                    <MdDelete />
                    {deletingId === notification.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              )}
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

        {notificationToDelete && (
          <div
            className="modal-backdrop notification-delete-backdrop"
            role="presentation"
            onClick={() => {
              if (!deletingId) setNotificationToDelete(null);
            }}
          >
            <section
              className="modal-card notification-delete-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-notification-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="notification-delete-icon">
                <MdDelete />
              </div>
              <div className="notification-delete-copy">
                <span className="eyebrow">Delete notification</span>
                <h2 id="delete-notification-title">Remove this alert?</h2>
                <p>
                  This deletes the notification from Supabase and removes it from
                  recipient notification lists.
                </p>
              </div>

              <div className="notification-delete-preview">
                <strong>{notificationToDelete.title || "Notification"}</strong>
                <p>
                  {notificationToDelete.message ||
                    notificationToDelete.description ||
                    "No message content."}
                </p>
                <small>
                  {notificationToDelete.profiles
                    ? `To ${
                        notificationToDelete.profiles.full_name ||
                        notificationToDelete.profiles.email
                      }`
                    : "Announcement"}
                </small>
              </div>

              <div className="notification-delete-actions">
                <button
                  className="ghost-btn"
                  type="button"
                  onClick={() => setNotificationToDelete(null)}
                  disabled={Boolean(deletingId)}
                >
                  <MdClose />
                  Keep notification
                </button>
                <button
                  className="danger-btn"
                  type="button"
                  onClick={deleteNotification}
                  disabled={Boolean(deletingId)}
                >
                  <MdDelete />
                  {deletingId ? "Deleting..." : "Delete permanently"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
