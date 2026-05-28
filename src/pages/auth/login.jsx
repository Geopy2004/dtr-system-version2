import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
// eslint-disable-next-line no-unused-vars
import { FiEye, FiEyeOff, FiLock, FiMail, FiShield } from "react-icons/fi";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/logo/logo.png";
import { isAdminEmail } from "../../services/api";
import "./auth.css";

const Login = () => {
  const navigate = useNavigate();
  const { user, isAdmin, login, loading } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = useMemo(
    () => (isAdmin ? "/admin/dashboard" : "/user/dashboard"),
    [isAdmin]
  );

  if (user && !loading) return <Navigate to={nextPath} replace />;

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

    setSubmitting(true);
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
      setSubmitting(false);
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
          <img src={logo} alt="One Punch-In" className="auth-logo" />
          <div>
            <strong>One Punch-In</strong>
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
                placeholder="you@gmail.com"
                disabled={loading || submitting}
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
                disabled={loading || submitting}
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

          <button className="auth-submit" type="submit" disabled={loading || submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          New to One Punch-In? <Link to="/register">Create an account</Link>
        </p>
      </motion.section>
    </main>
  );
};

export default Login;
