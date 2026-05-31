import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Loader from "./components/common/loader";

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";

// Auth Pages
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import UpdatePassword from "./pages/auth/UpdatePassword";
import Profile from "./pages/profile/Profile";
import Notifications from "./pages/notifications/Notifications";

// Admin Pages
import AdminDashboard from "./pages/admin/admindashboard";
import ManageUsers from "./pages/admin/manageusers";
import {
  AdminAttendance,
  AdminLeaveManagement,
  AuditTrail,
  DepartmentManagement,
  ReportsAnalytics,
  ScheduleManagement,
  SystemSettings,
} from "./pages/admin/AdminModules";

// User Pages
import UserDashboard from "./pages/users/userdashboard";
import MyAttendance from "./pages/users/myattendance";
import TimeInOut from "./pages/users/timeinout";
import UserLogs from "./pages/users/userlogs";
import Leave from "./pages/users/leave";
import About from "./pages/users/about";

// Protected Route
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  const { loading } = useAuth();
  const location = useLocation();
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    setRouteLoading(true);
    const timer = window.setTimeout(() => setRouteLoading(false), 280);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  if (loading || routeLoading) {
    return <Loader />;
  }

  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
      </Route>

      {/* Admin Routes */}
      <Route
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/manage-users" element={<ManageUsers />} />
        <Route path="/admin/attendance" element={<AdminAttendance />} />
        <Route path="/admin/leaves" element={<AdminLeaveManagement />} />
        <Route path="/admin/departments" element={<DepartmentManagement />} />
        <Route path="/admin/schedules" element={<ScheduleManagement />} />
        <Route path="/admin/reports" element={<ReportsAnalytics />} />
        <Route path="/admin/audit" element={<AuditTrail />} />
        <Route path="/admin/settings" element={<SystemSettings />} />
        <Route path="/admin/profile" element={<Profile />} />
        <Route path="/admin/notifications" element={<Notifications />} />
      </Route>

      {/* User Routes */}
      <Route
        element={
          <ProtectedRoute>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/user/dashboard" element={<UserDashboard />} />
        <Route path="/user/attendance" element={<MyAttendance />} />
        <Route path="/user/time-inout" element={<TimeInOut />} />
        <Route path="/user/logs" element={<UserLogs />} />
        <Route path="/user/leave" element={<Leave />} />
        <Route path="/user/about" element={<About />} />
        <Route path="/user/profile" element={<Profile />} />
        <Route path="/user/notifications" element={<Notifications />} />
      </Route>

      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
