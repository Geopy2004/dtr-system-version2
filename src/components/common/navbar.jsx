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
      <div className="navbar-brand">
        <h2>Attendance System</h2>
      </div>

      <div className="navbar-menu">
        <div className="user-info">
          <span className="user-name">
            {user?.user_metadata?.name || user?.email}
          </span>

          <span className={`user-role ${userRole}`}>
            {userRole}
          </span>
        </div>

        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </nav>
  );
}