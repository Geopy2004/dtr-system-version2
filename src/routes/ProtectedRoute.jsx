import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute Component
 * 
 * Protects routes that require authentication.
 * Redirects to login if not authenticated.
 * Redirects to user dashboard if trying to access admin-only routes as non-admin.
 * 
 * @param {React.ReactNode} children - The component to render if authorized
 * @param {boolean} adminOnly - If true, only admin users can access this route
 * @returns {React.ReactNode} - Children if authorized, Navigate to login if not
 */
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin, loading } = useAuth();

  // ─────────────────────────────
  // LOADING STATE
  // ─────────────────────────────
  // Show nothing while authentication is being verified
  if (loading) {
    return null;
  }

  // ─────────────────────────────
  // NOT LOGGED IN
  // ─────────────────────────────
  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ─────────────────────────────
  // ADMIN ONLY ROUTE
  // ─────────────────────────────
  // Redirect non-admin users to user dashboard
  if (adminOnly && !isAdmin) {
    return <Navigate to="/user/dashboard" replace />;
  }

  // ─────────────────────────────
  // AUTHORIZED
  // ─────────────────────────────
  // All checks passed - render the protected component
  return children;
}