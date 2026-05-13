import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiMail, FiShield } from "react-icons/fi";
import { motion } from "framer-motion";
import { authAPI } from "../../services/api";
import "./auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(email.trim().toLowerCase());
      toast.success("Password reset link sent.");
    } catch (error) {
      toast.error(error?.message || "Unable to send reset link.");
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
            <span>Account recovery</span>
          </div>
        </div>

        <div className="auth-heading">
          <p>Reset access</p>
          <h1>Forgot password</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <div className="auth-input">
              <FiMail />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                disabled={loading}
              />
            </div>
          </label>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="auth-switch">
          Back to <Link to="/login">sign in</Link>
        </p>
      </motion.section>
    </main>
  );
}
