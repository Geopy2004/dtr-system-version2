import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Layouts
import AuthLayout from "./layouts/AuthLayout";
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";

// Auth Pages
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import UpdatePassword from "./pages/auth/UpdatePassword";

// Admin Pages
import AdminDashboard from "./pages/admin/admindashboard";
import ManageUsers from "./pages/admin/manageusers";

// User Pages
import UserDashboard from "./pages/users/userdashboard";
import MyAttendance from "./pages/users/myattendance";
import TimeInOut from "./pages/users/timeinout";
import UserLogs from "./pages/users/userlogs";
import Leave from "./pages/users/leave";

// Protected Route
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
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
      </Route>

      {/* Redirect root to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
