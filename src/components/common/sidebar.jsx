import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import {
  MdAccessTime,
  MdAdminPanelSettings,
  MdAnalytics,
  MdCalendarMonth,
  MdClose,
  MdDashboard,
  MdHistory,
  MdLogout,
  MdMenu,
  MdNotificationsActive,
  MdOutlineBadge,
  MdPeople,
  MdSettings,
  MdWorkHistory,
} from "react-icons/md";
import "./sidebar.css";

const userMenus = [
  { path: "/user/dashboard", icon: <MdDashboard />, label: "Dashboard" },
  { path: "/user/myattendance", icon: <MdAccessTime />, label: "My Attendance" },
  { path: "/user/logs", icon: <MdHistory />, label: "My Logs" },
  { path: "/user/leave", icon: <MdWorkHistory />, label: "Leave" },
];

const adminMenus = [
  { path: "/admin/dashboard", icon: <MdDashboard />, label: "Command Center" },
  { path: "/admin/users", icon: <MdPeople />, label: "Employees" },
  { path: "/admin/attendance", icon: <MdAccessTime />, label: "Attendance" },
  { path: "/admin/departments", icon: <MdOutlineBadge />, label: "Departments" },
  { path: "/admin/schedules", icon: <MdCalendarMonth />, label: "Schedules" },
  { path: "/admin/leave", icon: <MdWorkHistory />, label: "Leave" },
  { path: "/admin/reports", icon: <MdAnalytics />, label: "Reports" },
  { path: "/admin/logs", icon: <MdHistory />, label: "Audit Trail" },
  { path: "/admin/settings", icon: <MdSettings />, label: "Settings" },
];

export default function Sidebar() {
  const { isAdmin, logout, user, profile } = useAuth();
  const navigate = useNavigate();
  const logoutInProgressRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
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

  const menus = isAdmin ? adminMenus : userMenus;
  const displayName =
    profile?.full_name || profile?.name || user?.email?.split("@")[0] || "Operator";

  return (
    <>
      <button
        className="mobile-menu-btn"
        type="button"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <MdMenu />
      </button>

      {open && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setOpen(false)} />}

      <motion.aside
        className={`sidebar ${open ? "open" : ""}`}
        initial={{ x: -22, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <button
          className="sidebar-close"
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <MdClose />
        </button>

        <div className="brand-block">
          <div className="brand-mark">
            <MdAdminPanelSettings />
          </div>
          <div>
            <h1>DTR Nexus</h1>
            <p>{isAdmin ? "Enterprise Command" : "Employee Workspace"}</p>
          </div>
        </div>

        <div className="operator-card">
          <div className="operator-avatar">{displayName.slice(0, 1).toUpperCase()}</div>
          <div>
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
              onClick={() => setOpen(false)}
            >
              <span>{menu.icon}</span>
              {menu.label}
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
            {isLoggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
