import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import "./navbar.css";

const Navbar = ({ onToggleSidebar }) => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/login");
    } catch {
      toast.error("Failed to logout");
    }
  };

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="hamburger" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div className="navbar-brand">
          <span className="brand-icon">⏱</span>
          <span className="brand-name">DTR System</span>
        </div>
      </div>
      <div className="navbar-right">
        <div className="user-info">
          <div className="user-avatar">{initials}</div>
          <div className="user-details">
            <span className="user-name">{profile?.full_name || "User"}</span>
            <span className="user-role">{profile?.role || "employee"}</span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
