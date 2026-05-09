import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, userRole, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <nav className="navbar">
      {/* LEFT - BRAND */}
      <div className="navbar-left">
        <div className="brand">
          <div className="logo">📊</div>
          <h2>Attendance System</h2>
        </div>
      </div>

      {/* RIGHT - USER INFO */}
      <div className="navbar-right">
        <div className="user-box">
          <div className="user-avatar">
            {user?.email?.charAt(0).toUpperCase()}
          </div>

          <div className="user-details">
            <span className="user-name">
              {user?.user_metadata?.name || user?.email}
            </span>

            <span className={`user-role ${userRole}`}>
              {userRole}
            </span>
          </div>
        </div>

        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
}