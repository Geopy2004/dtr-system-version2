import { useState, useEffect, useCallback } from "react";
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
  const { isAdmin, logout, user } = useAuth();
  const navigate = useNavigate();

  /* =========================
     STATES
  ========================= */
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [animating, setAnimating] = useState(false);

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
     OPEN WITH ANIMATION
  ========================= */
  const openMenu = () => {
    setOpen(true);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 350);
  };

  const closeMenu = () => {
    setOpen(false);
  };

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
      path: "/user/attendance",
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
     LOGOUT
  ========================= */
  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  return (
    <>
      {/* =========================
          BURGER — fixed top-left
      ========================= */}
      <button
        className={`burger ${open ? "burger-hidden" : ""}`}
        onClick={openMenu}
        aria-label="Open menu"
      >
        <span className="burger-line" />
        <span className="burger-line" />
        <span className="burger-line" />
      </button>

      {/* =========================
          OVERLAY
      ========================= */}
      {open && (
        <div
          className="overlay"
          onClick={closeMenu}
        />
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
        >
          <MdClose size={20} />
        </button>

        {/* =========================
            LOGO
        ========================= */}
        <div className={`sidebar-logo ${open ? "animate-in" : ""}`}
          style={{ animationDelay: "0.05s" }}>
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
        <div className={`sidebar-user ${open ? "animate-in" : ""}`}
          style={{ animationDelay: "0.1s" }}>
          <div className="user-avatar">
            <MdAccountCircle size={38} />
          </div>
          <div className="user-info">
            <p className="welcome-text">Welcome back</p>
            <h4 className="user-name">
              {user?.name || (isAdmin ? "Administrator" : "Employee")}
            </h4>
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
              onClick={closeMenu}
            >
              <span className="sidebar-icon">{menu.icon}</span>
              <span className="sidebar-label">{menu.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* =========================
            FOOTER
        ========================= */}
        <div className={`sidebar-footer ${open ? "animate-in" : ""}`}
          style={{ animationDelay: `${0.15 + menus.length * 0.06}s` }}>
          <button className="logout" onClick={handleLogout}>
            <MdLogout size={20} />
            <span>Logout</span>
          </button>
          <p className="version-info">v1.0 • System Online</p>
        </div>

      </aside>
    </>
  );
}