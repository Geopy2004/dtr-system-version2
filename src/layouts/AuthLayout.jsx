import { Outlet, useLocation } from "react-router-dom";
import "./AuthLayout.css";

const AuthLayout = () => {
  const { pathname } = useLocation();
  const isRegister   = pathname === "/register";

  return (
    <div className="auth-layout">
      {/* Animated mesh background */}
      <div className="auth-bg" aria-hidden="true">
        <div className="mesh-blob b1" />
        <div className="mesh-blob b2" />
        <div className="mesh-blob b3" />
        <div className="mesh-grid"  />
      </div>

      {/* Scrollable form wrapper */}
      <div className="auth-scroll">
        <div className={`auth-container ${isRegister ? "wide" : ""}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;