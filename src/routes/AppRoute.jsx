// routes/AppRoute.jsx
import { Routes, Route } from "react-router-dom";
import Login from "../pages/auth/login";
import AdminDashboard from "../pages/admin/admindashboard";
import UserDashboard from "../pages/users/userdashboard";

function AppRoute() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/user" element={<UserDashboard />} />
    </Routes>
  );
}

export default AppRoute;