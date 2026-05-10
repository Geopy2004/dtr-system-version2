import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import AdminDashboard from "./pages/admin/admindashboard";
import UserDashboard from "./pages/users/userdashboard";

function App() {
  return (
    <Routes>
      {/* ROOT */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      {/* AUTH */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* DASHBOARDS */}
      <Route
        path="/admin/dashboard"
        element={<AdminDashboard />}
      />

      <Route
        path="/user/dashboard"
        element={<UserDashboard />}
      />

      {/* FALLBACK */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  );
}

export default App;