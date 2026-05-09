import { Outlet } from 'react-router-dom';
import Navbar from '../components/navbar';
import Sidebar from '../components/sidebar';

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <Navbar />
      <div className="layout-content">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}