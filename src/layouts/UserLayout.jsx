import { Outlet } from 'react-router-dom';
import Navbar from '../components/navbar';
import Sidebar from '../components/sidebar';

export default function UserLayout() {
  return (
    <div className="user-layout">
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