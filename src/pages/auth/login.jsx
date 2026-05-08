import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(
        "http://localhost/dtr-api/login.php",
        {
          username,
          password,
        }
      );

      console.log("Response:", res.data); // Debug: See what API returns

      if (res.data.role === "admin") {
        navigate("/admin");
      } else if (res.data.role === "user") {
        navigate("/user");
      } else {
        setError("Invalid role specified");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid login credentials");
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin}>
        <h1>DTR Login</h1>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="error-message">{error}</div>}

        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default Login;