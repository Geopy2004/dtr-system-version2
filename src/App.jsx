import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import UpdatePassword from "./pages/auth/UpdatePassword";
import UserDashboard from "./pages/users/userdashboard";
import MyAttendance from "./pages/users/myattendance";
import MyLogs from "./pages/users/userlogs";
import LeavePortal from "./pages/users/leave";
import AdminDashboard from "./pages/admin/admindashboard";
import {
  AdminAttendance,
  AdminLeaveManagement,
  AuditTrail,
  DepartmentManagement,
  EmployeeManagement,
  ReportsAnalytics,
  ScheduleManagement,
  SystemSettings,
} from "./pages/admin/AdminModules";
import ProtectedRoute from "./routes/ProtectedRoute";
import Loader from "./components/common/loader";
import "./styles/platform.css";

function HomeRedirect() {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? "/admin/dashboard" : "/user/dashboard"} replace />;
}

function App() {
  const { loading } = useAuth();

  if (loading) return <Loader />;

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/update-password" element={<UpdatePassword />} />

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
      <Route path="/my-attendance" element={<Navigate to="/user/myattendance" replace />} />
      <Route
        path="/user/logs"
        element={
          <ProtectedRoute>
            <MyLogs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/leave"
        element={
          <ProtectedRoute>
            <LeavePortal />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute adminOnly>
            <EmployeeManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/attendance"
        element={
          <ProtectedRoute adminOnly>
            <AdminAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/departments"
        element={
          <ProtectedRoute adminOnly>
            <DepartmentManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/schedules"
        element={
          <ProtectedRoute adminOnly>
            <ScheduleManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/leave"
        element={
          <ProtectedRoute adminOnly>
            <AdminLeaveManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute adminOnly>
            <ReportsAnalytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <ProtectedRoute adminOnly>
            <AuditTrail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute adminOnly>
            <SystemSettings />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
