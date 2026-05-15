import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiBriefcase,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { authAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./auth.css";

const departments = [
  "Engineering",
  "Human Resources",
  "Finance",
  "Operations",
  "Sales",
  "Administration",
  "Support",
];

const getStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  return ["", "Weak", "Fair", "Good", "Strong"][score];
};

const Register = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    password: "",
    confirmPassword: "",
  });

  const strength = useMemo(() => getStrength(form.password), [form.password]);

  if (user) {
    return (
      <Navigate to={isAdmin ? "/admin/dashboard" : "/user/dashboard"} replace />
    );
  }

  const set = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const validate = () => {
    const email = form.email.trim().toLowerCase();
    if (!form.firstName.trim() || !form.lastName.trim()) return "Name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Use a valid email.";
    if (!form.department) return "Select a department.";
    if (form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);
    try {
      await authAPI.register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        department: form.department,
      });
      toast.success("Account created. Check your inbox to verify your email.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error(err?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <motion.section
        className="auth-card wide"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="auth-brand">
          <span className="auth-mark">
            <FiShield />
          </span>
          <div>
              <strong>One Punch-In</strong>
            <span>Email verification enabled</span>
          </div>
        </div>

        <div className="auth-heading">
          <p>Employee enrollment</p>
          <h1>Create account</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-grid two">
            <label className="auth-field">
              <span>First name</span>
              <div className="auth-input">
                <FiUser />
                <input
                  value={form.firstName}
                  onChange={set("firstName")}
                  placeholder="Ada"
                  disabled={loading}
                />
              </div>
            </label>

            <label className="auth-field">
              <span>Last name</span>
              <div className="auth-input">
                <FiUser />
                <input
                  value={form.lastName}
                  onChange={set("lastName")}
                  placeholder="Lovelace"
                  disabled={loading}
                />
              </div>
            </label>
          </div>

          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input">
              <FiMail />
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
                placeholder="you@gmail.com"
                disabled={loading}
              />
            </div>
          </label>

          <label className="auth-field">
            <span>Department</span>
            <div className="auth-input">
              <FiBriefcase />
              <select
                value={form.department}
                onChange={set("department")}
                disabled={loading}
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-input">
              <FiLock />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={form.password}
                onChange={set("password")}
                placeholder="Minimum 8 characters"
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
            {strength && <i className={`strength ${strength.toLowerCase()}`}>{strength}</i>}
          </label>

          <label className="auth-field">
            <span>Confirm password</span>
            <div className="auth-input">
              <FiLock />
              <input
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                placeholder="Repeat password"
                disabled={loading}
              />
              <button
                className="auth-icon-btn"
                type="button"
                onClick={() => setShowConfirm((value) => !value)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </label>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </motion.section>
    </main>
  );
};

export default Register;
