import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import AdminDashboard from "./pages/admin/admindashboard";
import UserDashboard from "./pages/users/userdashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Loader from "./components/common/loader";

function App() {
  const { loading } = useAuth();

  // Show loader while auth is initializing
  if (loading) {
    return <Loader />;
  }

  return (
    <Routes>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ROOT - REDIRECT TO LOGIN */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* AUTH ROUTES - PUBLIC (always accessible) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* USER ROUTES - PROTECTED (requires authentication) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Route
        path="/user/dashboard"
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/user/myattendance"
        element={
          <ProtectedRoute>
            {/* Add MyAttendance component here */}
            <div>My Attendance Page</div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/user/logs"
        element={
          <ProtectedRoute>
            {/* Add Logs component here */}
            <div>My Logs Page</div>
          </ProtectedRoute>
        }
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ADMIN ROUTES - PROTECTED + ADMIN ONLY */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute adminOnly={true}>
            {/* Add ManageUsers component here */}
            <div>Manage Users Page</div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/attendance"
        element={
          <ProtectedRoute adminOnly={true}>
            {/* Add AllAttendance component here */}
            <div>All Attendance Page</div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/logs"
        element={
          <ProtectedRoute adminOnly={true}>
            {/* Add SystemLogs component here */}
            <div>System Logs Page</div>
          </ProtectedRoute>
        }
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FALLBACK - 404 REDIRECT TO LOGIN */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;