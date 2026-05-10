import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import AuthLayout    from "../layouts/AuthLayout";
import AdminLayout   from "../layouts/AdminLayout";
import UserLayout    from "../layouts/UserLayout";
import ProtectedRoute from "./ProtectedRoute";

import Login          from "../pages/auth/login";
import Register       from "../pages/auth/register";
import AdminDashboard from "../pages/admin/admindashboard";
import ManageUsers    from "../pages/admin/manageusers";
import UserDashboard  from "../pages/users/Userdashboard";
import MyAttendance   from "../pages/users/myattendance";

const AppRoute = () => {
  const { user, profile, loading } = useAuth();
  if (loading) return null;

  const home = profile?.role === "admin" ? "/admin" : "/dashboard";

  return (
    <Routes>

      {/* ── Auth (public) ── */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={user ? <Navigate to={home} replace /> : <Login />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to={home} replace /> : <Register />}
        />
      </Route>

      {/* ── Admin ── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<ManageUsers />} />
      </Route>

      {/* ── Employee ── */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<UserDashboard />} />
        <Route path="attendance" element={<MyAttendance />} />
      </Route>

      {/* ── Catch-all ── */}
      <Route path="/"  element={<Navigate to="/login"  replace />} />
      <Route path="*"  element={<Navigate to="/login"  replace />} />

    </Routes>
  );
};

export default AppRoute;