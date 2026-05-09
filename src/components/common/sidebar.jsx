import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MdDashboard, MdPeople, MdAccessTime, MdHistory } from 'react-icons/md';

export default function Sidebar() {
  const { isAdmin } = useAuth(); // Removed unused isUser

  const userMenus = [
    { path: '/user/dashboard', icon: <MdDashboard />, label: 'Dashboard' },
    { path: '/user/attendance', icon: <MdAccessTime />, label: 'My Attendance' },
    { path: '/user/logs', icon: <MdHistory />, label: 'My Logs' },
  ];

  const adminMenus = [
    { path: '/admin/dashboard', icon: <MdDashboard />, label: 'Dashboard' },
    { path: '/admin/users', icon: <MdPeople />, label: 'Manage Users' },
    { path: '/admin/attendance', icon: <MdAccessTime />, label: 'All Attendance' },
    { path: '/admin/logs', icon: <MdHistory />, label: 'System Logs' },
  ];

  const menus = isAdmin ? adminMenus : userMenus;

  return (
    <aside className="sidebar">
      <div className="sidebar-menu">
        {menus.map((menu) => (
          <NavLink
            key={menu.path}
            to={menu.path}
            className={({ isActive }) => 
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            <span className="icon">{menu.icon}</span>
            <span className="label">{menu.label}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
}