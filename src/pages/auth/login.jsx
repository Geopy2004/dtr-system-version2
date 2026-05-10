import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../services/supabase";
import toast from "react-hot-toast";
import "./auth.css";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = form.email.trim();
    const password = form.password.trim();

    if (!email || !password) {
      return toast.error("Please fill in all fields.");
    }

    setLoading(true);

    try {
      // 1. LOGIN USER
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 2. FETCH PROFILE (ROLE IS HERE)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Profile not found. Contact admin.");
      }

      toast.success("Welcome back!");

      // 3. ROLE-BASED DASHBOARD FIX (THIS FIXES YOUR ISSUE)
      if (profile.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/user/dashboard", { replace: true });
      }

    } catch (err) {
      toast.error(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">

      {/* BRAND */}
      <div className="auth-brand">
        <span className="auth-app-name">Gaming Startup</span>
      </div>

      {/* TITLE */}
      <div className="auth-heading">
        <h2>Sign in</h2>
        <p>Track your time every day</p>
      </div>

      {/* FORM */}
      <form className="auth-form" onSubmit={handleSubmit}>

        {/* EMAIL */}
        <div className="field">
          <label>Email</label>

          <div className="input-group">
            <span className="input-icon">📧</span>

            <input
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="you@company.com"
              disabled={loading}
            />
          </div>
        </div>

        {/* PASSWORD */}
        <div className="field">
          <label>Password</label>

          <div className="input-group">
            <span className="input-icon">🔒</span>

            <input
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={handleChange("password")}
              placeholder="Enter password"
              disabled={loading}
            />

            <button
              type="button"
              className="eye-btn"
              onClick={() => setShowPw((v) => !v)}
            >
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* BUTTON */}
        <button type="submit" className="auth-btn primary" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* FOOTER */}
      <div className="auth-switch">
        <span>Don't have an account? </span>
        <Link to="/register">Create account</Link>
      </div>
    </div>
  );
};

export default Login;