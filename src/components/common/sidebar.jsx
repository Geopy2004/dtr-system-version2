import { useState, useEffect, useCallback, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Sidebar.css";

import {
  MdDashboard,
  MdPeople,
  MdAccessTime,
  MdHistory,
  MdClose,
  MdLogout,
  MdAccountCircle,
} from "react-icons/md";

export default function Sidebar() {
  const { isAdmin, logout, user, profile } = useAuth();
  const navigate = useNavigate();
  const logoutInProgressRef = useRef(false);

  /* =========================
     STATES
  ========================= */
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /* =========================
     PREVENT BODY SCROLL
  ========================= */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  /* =========================
     MENU ITEMS
  ========================= */
  const userMenus = [
    {
      path: "/user/dashboard",
      icon: <MdDashboard size={22} />,
      label: "Dashboard",
    },
    {
      path: "/user/myattendance",
      icon: <MdAccessTime size={22} />,
      label: "My Attendance",
    },
    {
      path: "/user/logs",
      icon: <MdHistory size={22} />,
      label: "My Logs",
    },
  ];

  const adminMenus = [
    {
      path: "/admin/dashboard",
      icon: <MdDashboard size={22} />,
      label: "Dashboard",
    },
    {
      path: "/admin/users",
      icon: <MdPeople size={22} />,
      label: "Manage Users",
    },
    {
      path: "/admin/attendance",
      icon: <MdAccessTime size={22} />,
      label: "All Attendance",
    },
    {
      path: "/admin/logs",
      icon: <MdHistory size={22} />,
      label: "System Logs",
    },
  ];

  const menus = isAdmin ? adminMenus : userMenus;

  /* =========================
     OPEN MENU
  ========================= */
  const openMenu = useCallback(() => {
    if (!isLoggingOut) {
      setOpen(true);
    }
  }, [isLoggingOut]);

  /* =========================
     CLOSE MENU
  ========================= */
  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  /* =========================
     HANDLE LOGOUT
  ========================= */
  const handleLogout = useCallback(async (e) => {
    // Prevent any other clicks from interfering
    e?.preventDefault?.();
    e?.stopPropagation?.();

    // Prevent multiple logout calls
    if (logoutInProgressRef.current || isLoggingOut) {
      return;
    }

    logoutInProgressRef.current = true;
    setIsLoggingOut(true);

    try {
      await logout();
      // ProtectedRoute will redirect to login when user becomes null
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout error:", err);
      // Even if logout fails, redirect to login
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
      logoutInProgressRef.current = false;
    }
  }, [logout, navigate, isLoggingOut]);

  /* =========================
     HANDLE NAVIGATION
  ========================= */
  const handleNavClick = useCallback((e) => {
    // Prevent logout from being triggered
    if (logoutInProgressRef.current || isLoggingOut) {
      e.preventDefault();
      return;
    }
    // Close menu when navigating
    closeMenu();
  }, [isLoggingOut, closeMenu]);

  return (
    <>
      {/* =========================
          BURGER MENU BUTTON
      ========================= */}
      <button
        className={`burger ${open ? "burger-hidden" : ""}`}
        onClick={openMenu}
        aria-label="Open menu"
        disabled={isLoggingOut}
        type="button"
      >
        <span className="burger-line" />
        <span className="burger-line" />
        <span className="burger-line" />
      </button>

      {/* =========================
          OVERLAY
      ========================= */}
      {open && (
        <div className="overlay" onClick={closeMenu} />
      )}

      {/* =========================
          SIDEBAR
      ========================= */}
      <aside className={`sidebar ${open ? "open" : ""}`}>

        {/* CLOSE BUTTON */}
        <button
          className="close-btn"
          onClick={closeMenu}
          aria-label="Close menu"
          type="button"
        >
          <MdClose size={20} />
        </button>

        {/* =========================
            LOGO
        ========================= */}
        <div
          className={`sidebar-logo ${open ? "animate-in" : ""}`}
          style={{ animationDelay: "0.05s" }}
        >
          <div className="logo-badge">📊</div>
          <div>
            <h2 className="logo-title">Attendance</h2>
            <p className="logo-subtitle">
              {isAdmin ? "Admin Panel" : "User Panel"}
            </p>
          </div>
        </div>

        {/* =========================
            USER INFO
        ========================= */}
        <div
          className={`sidebar-user ${open ? "animate-in" : ""}`}
          style={{ animationDelay: "0.1s" }}
        >
          <div className="user-avatar">
            <MdAccountCircle size={38} />
          </div>
          <div className="user-info">
            <p className="welcome-text">Welcome back</p>
            <h4 className="user-name">
              {profile?.full_name || user?.email || "User"}
            </h4>
            <p style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>
              {isAdmin ? "Administrator" : "Employee"}
            </p>
          </div>
        </div>

        {/* =========================
            NAVIGATION
        ========================= */}
        <nav className="menu">
          {menus.map((menu, i) => (
            <NavLink
              key={menu.path}
              to={menu.path}
              end={
                menu.path === "/user/dashboard" ||
                menu.path === "/admin/dashboard"
              }
              className={({ isActive }) =>
                `link ${isActive ? "active" : ""} ${open ? "animate-in" : ""}`
              }
              style={{ animationDelay: `${0.15 + i * 0.06}s` }}
              onClick={handleNavClick}
            >
              <span className="sidebar-icon">{menu.icon}</span>
              <span className="sidebar-label">{menu.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* =========================
            FOOTER
        ========================= */}
        <div
          className={`sidebar-footer ${open ? "animate-in" : ""}`}
          style={{ animationDelay: `${0.15 + menus.length * 0.06}s` }}
        >
          <button
            className="logout"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={isLoggingOut ? "Logging out..." : "Click to logout"}
            type="button"
          >
            <MdLogout size={20} />
            <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </button>
          <p className="version-info">v1.0 • System Online</p>
        </div>

      </aside>
    </>
  );
}