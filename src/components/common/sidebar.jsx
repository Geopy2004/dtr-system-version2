import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import {
  MdAccessTime,
  MdAdminPanelSettings,
  MdClose,
  MdDashboard,
  MdHistory,
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
  { path: "/user/leave", icon: <MdWorkHistory />, label: "Leave" },
];

const adminMenus = [
  { path: "/admin/dashboard", icon: <MdDashboard />, label: "Command Center" },
  { path: "/admin/manage-users", icon: <MdPeople />, label: "Manage Users" },
  { path: "/admin/attendance", icon: <MdAccessTime />, label: "Attendance Records" },
  { path: "/admin/leaves", icon: <MdWorkHistory />, label: "Leave Approvals" },
  { path: "/admin/reports", icon: <MdHistory />, label: "Reports" },
  { path: "/admin/settings", icon: <MdSettings />, label: "Settings" },
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
  const logoutInProgressRef = useRef(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

  const menus = isAdmin ? adminMenus : userMenus;
  const displayName =
    profile?.full_name || profile?.name || user?.email?.split("@")[0] || "Operator";

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
        className={`sidebar ${open ? "open" : ""}`}
        aria-hidden={!open}
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
          <div className="operator-avatar">{displayName.slice(0, 1).toUpperCase()}</div>
          <div className="operator-details">
            <span>Signed in as</span>
            <strong>{displayName}</strong>
            <p>{isAdmin ? "Administrator" : "Employee"}</p>
          </div>
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
