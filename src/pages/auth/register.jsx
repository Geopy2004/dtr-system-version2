import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../services/supabase";
import toast from "react-hot-toast";
import "./register.css";

/* ── Password strength helper ── */
const getStrength = (pw) => {
  if (!pw) return { score: 0, label: "", cls: "" };

  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const map = [
    { label: "", cls: "" },
    { label: "Weak", cls: "weak" },
    { label: "Fair", cls: "fair" },
    { label: "Good", cls: "good" },
    { label: "Strong", cls: "strong" },
  ];

  return { score, ...map[score] };
};

/* ── Password Input (ICON INSIDE INPUT) ── */
const PasswordInput = ({
  value,
  onChange,
  placeholder,
  show,
  toggle,
  disabled,
}) => {
  return (
    <div className="password-field">
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />

      <span
        className="toggle-eye"
        onClick={toggle}
        role="button"
        tabIndex={0}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? "🙈" : "👁️"}
      </span>
    </div>
  );
};

const DEPARTMENTS = [
  "Engineering",
  "Human Resources",
  "Finance",
  "Marketing",
  "Operations",
  "Sales",
  "IT",
  "Administration",
  "Other",
];

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    password: "",
    confirm: "",
  });

  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const strength = useMemo(
    () => getStrength(form.password),
    [form.password]
  );

  /* ── Validation (GMAIL ONLY) ── */
  const validate = () => {
    const email = form.email.trim().toLowerCase();

    if (!form.firstName.trim() || !form.lastName.trim())
      return "First and last name are required.";

    if (!email) return "Email is required.";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Please enter a valid email address.";

    if (!email.endsWith("@gmail.com"))
      return "Only Gmail accounts are allowed.";

    if (!form.department)
      return "Please select a department.";

    if (form.password.length < 8)
      return "Password must be at least 8 characters.";

    if (form.password !== form.confirm)
      return "Passwords do not match.";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const err = validate();
    if (err) return toast.error(err);

    setLoading(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          options: {
            data: {
              full_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
              department: form.department,
            },
          },
        });

      if (authError) throw authError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: authData.user.id,
            email: form.email.trim().toLowerCase(),
            full_name: `${form.firstName.trim()} ${form.lastName.trim()}`,
            department: form.department,
            role: "employee",
          });

        if (profileError)
          console.warn("Profile warning:", profileError.message);
      }

      toast.success("Account created! Check your Gmail inbox.", {
        duration: 5000,
      });

      navigate("/login");
    } catch (err) {
      toast.error(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-brand">
        <span className="auth-app-name">GAMING STARTUP</span>
      </div>

      <div className="auth-heading">
        <h2>Create your account</h2>
        <p>Fill in your details to get started.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {/* Name */}
        <div className="field-row">
          <input
            type="text"
            placeholder="First Name"
            value={form.firstName}
            onChange={set("firstName")}
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Last Name"
            value={form.lastName}
            onChange={set("lastName")}
            disabled={loading}
          />
        </div>

        {/* Email */}
        <input
          type="email"
          placeholder="you@gmail.com"
          value={form.email}
          onChange={set("email")}
          disabled={loading}
        />

        {/* Department */}
        <div className="field-row">
          <select
            value={form.department}
            onChange={set("department")}
            disabled={loading}
          >
            <option value="">Select Department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Password */}
        <PasswordInput
          value={form.password}
          onChange={set("password")}
          placeholder="Password"
          show={showPw}
          toggle={() => setShowPw((v) => !v)}
          disabled={loading}
        />

        {/* Strength */}
        {form.password && (
          <div className={`strength-label ${strength.cls}`}>
            {strength.label}
          </div>
        )}

        {/* Confirm Password */}
        <PasswordInput
          value={form.confirm}
          onChange={set("confirm")}
          placeholder="Confirm Password"
          show={showConfirm}
          toggle={() => setShowConfirm((v) => !v)}
          disabled={loading}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create Account"}
        </button>
      </form>

      <div className="auth-switch">
        <span>Already have an account?</span>
        <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
};

export default Register;
