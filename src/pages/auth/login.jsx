import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiEye, FiEyeOff, FiLock, FiMail, FiShield } from "react-icons/fi";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { isAdminEmail } from "../../services/api";
import "./auth.css";

const Login = () => {
  const navigate = useNavigate();
  const { user, isAdmin, login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const nextPath = useMemo(
    () => (isAdmin ? "/admin/dashboard" : "/user/dashboard"),
    [isAdmin]
  );

  if (user) return <Navigate to={nextPath} replace />;

  const handleChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();

    if (!email || !form.password) {
      toast.error("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, form.password);
      const isAdminUser =
        result.profile?.role === "admin" ||
        result.user?.app_metadata?.role === "admin" ||
        isAdminEmail(result.user?.email);
      toast.success("Welcome back.");
      navigate(isAdminUser ? "/admin/dashboard" : "/user/dashboard", {
        replace: true,
      });
    } catch (error) {
      toast.error(error?.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <motion.section
        className="auth-card"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="auth-brand">
          <span className="auth-mark">
            <FiShield />
          </span>
          <div>
            <strong>DTR Nexus</strong>
            <span>Attendance command platform</span>
          </div>
        </div>

        <div className="auth-heading">
          <p>Secure workspace</p>
          <h1>Sign in</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input">
              <FiMail />
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange("email")}
                placeholder="you@company.com"
                disabled={loading}
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-input">
              <FiLock />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange("password")}
                placeholder="Enter password"
                disabled={loading}
              />
              <button
                className="auth-icon-btn"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </label>

          <div className="auth-row">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          New to DTR Nexus? <Link to="/register">Create an account</Link>
        </p>
      </motion.section>
    </main>
  );
};

export default Login;
