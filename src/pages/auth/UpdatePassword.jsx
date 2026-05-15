import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiEye, FiEyeOff, FiLock, FiShield } from "react-icons/fi";
import { motion } from "framer-motion";
import { authAPI } from "../../services/api";
import { supabase } from "../../services/supabase";
import "./auth.css";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsRecoverySession(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authAPI.updatePassword(password);
      toast.success("Password updated.");
      navigate("/login", { replace: true });
    } catch (error) {
      toast.error(error?.message || "Unable to update password.");
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
              <strong>One Punch-In</strong>
            <span>{isRecoverySession ? "Recovery session active" : "Password update"}</span>
          </div>
        </div>

        <div className="auth-heading">
          <p>Secure reset</p>
          <h1>New password</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Password</span>
            <div className="auth-input">
              <FiLock />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
          </label>

          <label className="auth-field">
            <span>Confirm password</span>
            <div className="auth-input">
              <FiLock />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat password"
                disabled={loading}
              />
            </div>
          </label>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>

        <p className="auth-switch">
          Back to <Link to="/login">sign in</Link>
        </p>
      </motion.section>
    </main>
  );
}
