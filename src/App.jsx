import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Auth Pages
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";

// User Pages
import UserDashboard from "./pages/users/UserDashboard";
import MyAttendance from "./pages/users/myattendance";
import MyLogs from "./pages/users/userlogs";

// Admin Pages
import AdminDashboard from "./pages/admin/admindashboard";

// Components & Routes
import ProtectedRoute from "./routes/ProtectedRoute";
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
            <MyAttendance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/user/logs"
        element={
          <ProtectedRoute>
            <MyLogs />
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
            <div>Manage Users Page</div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/attendance"
        element={
          <ProtectedRoute adminOnly={true}>
            <div>All Attendance Page</div>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/logs"
        element={
          <ProtectedRoute adminOnly={true}>
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