import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { notificationAPI, realtimeAPI } from "../../services/api";
import {
  MdAccessTime,
  MdAdminPanelSettings,
  MdClose,
  MdDashboard,
  MdEdit,
  MdHistory,
  MdInfo,
  MdLogout,
  MdMenu,
  MdNotificationsActive,
  MdPeople,
  MdSettings,
  MdWorkHistory,
} from "react-icons/md";
import "./sidebar.css";
import logo from "../../assets/logo/logo.png";

const userMenus = [
  { path: "/user/dashboard", icon: <MdDashboard />, label: "Dashboard" },
  { path: "/user/attendance", icon: <MdAccessTime />, label: "My Attendance" },
  { path: "/user/logs", icon: <MdHistory />, label: "My Logs" },
  { path: "/user/leave", icon: <MdWorkHistory />, label: "Leave Request" },
  { path: "/user/notifications", icon: <MdNotificationsActive />, label: "Notifications" },
  { path: "/user/about", icon: <MdInfo />, label: "About" },
];
const adminMenus = [
  { path: "/admin/dashboard", icon: <MdDashboard />, label: "Command Center" },
  { path: "/admin/manage-users", icon: <MdPeople />, label: "Manage Users" },
  { path: "/admin/attendance", icon: <MdAccessTime />, label: "Attendance Records" },
  { path: "/admin/leaves", icon: <MdWorkHistory />, label: "Leave Approvals" },
  { path: "/admin/reports", icon: <MdHistory />, label: "Reports" },
  { path: "/admin/settings", icon: <MdSettings />, label: "Settings" },
  { path: "/admin/notifications", icon: <MdNotificationsActive />, label: "Notifications" },
];

const sidebarVariants = {
  closed: {
    x: "-104%",
    opacity: 0.96,
  },
  open: {
    x: 0,
    opacity: 1,
  },
};

const sidebarTransition = {
  type: "spring",
  stiffness: 360,
  damping: 34,
  mass: 0.85,
};

export default function Sidebar({ open = false, onClose, onOpen }) {
  const { isAdmin, logout, user, profile } = useAuth();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);
  const logoutInProgressRef = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (open) sidebarRef.current?.focus();
  }, [open]);

  const handleLogout = useCallback(async () => {
    if (logoutInProgressRef.current || isLoggingOut) return;
    logoutInProgressRef.current = true;
    setIsLoggingOut(true);

    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      logoutInProgressRef.current = false;
      navigate("/login", { replace: true });
    }
  }, [isLoggingOut, logout, navigate]);

  const loadUnreadNotifications = useCallback(async () => {
    if (isAdmin || !user?.id) {
      setUnreadNotifications(0);
      return;
    }

    try {
      setUnreadNotifications(await notificationAPI.getMyUnreadCount());
    } catch {
      setUnreadNotifications(0);
    }
  }, [isAdmin, user?.id]);

  useEffect(() => {
    loadUnreadNotifications();
  }, [loadUnreadNotifications]);

  useEffect(() => {
    if (isAdmin || !user?.id) return undefined;

    const refresh = () => loadUnreadNotifications();
    let unsubscribe;

    try {
      unsubscribe = realtimeAPI.subscribeToTable("notifications", refresh);
    } catch {
      unsubscribe = undefined;
    }

    const interval = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);

    return () => {
      unsubscribe?.();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [isAdmin, loadUnreadNotifications, user?.id]);

  const menus = isAdmin ? adminMenus : userMenus;
  const displayName =
    profile?.full_name || profile?.name || user?.email?.split("@")[0] || "Operator";
  const avatarUrl = profile?.avatar_url;
  const profilePath = isAdmin ? "/admin/profile" : "/user/profile";

  return (
    <>
      <button
        className={`mobile-menu-btn ${open ? "hidden" : ""}`}
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={onOpen}
      >
        <MdMenu />
      </button>

      <AnimatePresence>
        {open && (
          <motion.button
            className="sidebar-overlay"
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      <motion.aside
        ref={sidebarRef}
        className={`sidebar ${open ? "open" : ""}`}
        aria-hidden={!open}
        tabIndex={-1}
        initial={false}
        animate={open ? "open" : "closed"}
        variants={sidebarVariants}
        transition={sidebarTransition}
      >
        <button
          className="sidebar-close"
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
        >
          <MdClose />
        </button>

        <div className="brand-block">
          <div className="brand-mark">
            <MdAdminPanelSettings />
          </div>
          <div className="brand-copy">
            <img src={logo} alt="One Punch-In" className="brand-logo" />
            <p>{isAdmin ? "Enterprise Command" : "Employee Workspace"}</p>
          </div>
        </div>

        <div className="operator-card" title={displayName}>
          <div className="operator-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} />
            ) : (
              displayName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="operator-details">
            <span>Signed in as</span>
            <strong>{displayName}</strong>
            <p>{isAdmin ? "Administrator" : "Employee"}</p>
          </div>
          <button
            className="profile-edit-btn"
            type="button"
            onClick={() => {
              navigate(profilePath);
              onClose?.();
            }}
            aria-label="Update profile"
            title="Update profile"
          >
            <MdEdit />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {menus.map((menu) => (
            <NavLink
              key={menu.path}
              to={menu.path}
              end={menu.path.endsWith("dashboard")}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              <span className="sidebar-link-icon">{menu.icon}</span>
              <span className="sidebar-link-label">{menu.label}</span>
              {!isAdmin &&
                menu.path === "/user/notifications" &&
                unreadNotifications > 0 && (
                  <span className="sidebar-badge" aria-label={`${unreadNotifications} unread notifications`}>
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-system">
          <div className="system-row">
            <MdNotificationsActive />
            <span>Realtime sync</span>
            <i />
          </div>
          <button className="logout-btn" type="button" onClick={handleLogout} disabled={isLoggingOut}>
            <MdLogout />
            <span className="logout-label">
              {isLoggingOut ? "Signing out..." : "Logout"}
            </span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
