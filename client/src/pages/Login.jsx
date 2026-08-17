import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash, FaCrown } from "react-icons/fa";
import { brand, gradients, shadowCard, diagonalPattern, ribbonStyle } from "../theme";
import blueFarmLogo from "../assets/blue-farm-logo.png";
import blueRemountsLogo from "../assets/blue-remounts-logo.png";
import axios from "axios";
import { login } from "../api/authApi";

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [focusField, setFocusField] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await login(username.trim(), password);
      const { user, token } = res.data;

      // The token authorizes every subsequent API call — without it, the
      // server now rejects requests with 401 (see server/middleware/authMiddleware.js).
      localStorage.setItem("auth", JSON.stringify(user));
      localStorage.setItem("token", token);
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;

      if (user.role === "admin") {
        localStorage.removeItem("farm");
        navigate("/select-farm");
      } else {
        localStorage.setItem("farm", user.farm);
        navigate("/select-farm");
      }
    } catch (err) {
      if (err.response) {
        // Server responded (401, 400, 429, etc.) — show its real message.
        setError(err.response.data?.message || "Invalid username or password.");
      } else if (err.request) {
        // Request was sent but no response came back — server isn't
        // reachable, not a bad password.
        setError("Can't reach the server. Make sure the app's server is running, then try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputWrap = (field) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: "13px 16px",
    marginBottom: 18,
    borderRadius: 12,
    border: `2px solid ${focusField === field ? brand.gold : "#E5E9F2"}`,
    background: "#F8FAFD",
    transition: "0.25s",
    boxShadow: focusField === field ? `0 0 0 4px rgba(212,175,55,0.15)` : "none",
  });

  const inputStyle = {
    border: "none",
    outline: "none",
    background: "transparent",
    flex: 1,
    fontSize: 15,
    color: brand.ink,
  };

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        overflow: "hidden",
        fontFamily: "Segoe UI, Arial, sans-serif",
      }}
    >
      {/* LEFT BRAND PANEL */}
      <div
        style={{
          flex: 1.15,
          position: "relative",
          background: gradients.brand,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          overflow: "hidden",
        }}
      >
        {/* premium hairline texture */}
        <div style={{ position: "absolute", inset: 0, background: diagonalPattern, pointerEvents: "none" }} />

        {/* decorative glow circles */}
        <div style={{
          position: "absolute", top: -120, left: -100, width: 340, height: 340,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.25), transparent 70%)"
        }} />
        <div style={{
          position: "absolute", bottom: -140, right: -120, width: 420, height: 420,
          borderRadius: "50%", background: "radial-gradient(circle, rgba(10,143,220,0.35), transparent 70%)"
        }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 40px" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 26, marginBottom: 22 }}>
            <div style={{
              width: 84, height: 84, borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              border: `2px solid ${brand.gold}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 25px rgba(212,175,55,0.35)",
              overflow: "hidden",
            }}>
              <img src={blueFarmLogo} alt="Blue Farm" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{
              width: 84, height: 84, borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              border: `2px solid ${brand.gold}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 25px rgba(212,175,55,0.35)",
              overflow: "hidden",
            }}>
              <img src={blueRemountsLogo} alt="Blue Remounts" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 16px", borderRadius: 30,
            background: "rgba(212,175,55,0.15)", border: `1px solid ${brand.gold}`,
            marginBottom: 18, fontSize: 12, letterSpacing: 2, fontWeight: 700, color: brand.goldLight,
          }}>MANAGEMENT SUITE
          </div>

          <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: 1, marginBottom: 10 }}>
            BLUE FARM
          </h1>
          <p style={{ fontSize: 16, opacity: 0.85, maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
            Finance &amp; Human Resource Management for Blue Farm &amp; Blue Remounts
          </p>
        </div>
      </div>

      {/* RIGHT LOGIN FORM */}
      <div
        style={{
          flex: 1,
          minWidth: 420,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F4F7FC",
        }}
      >
        <form
          onSubmit={handleLogin}
          style={{
            position: "relative",
            width: 380,
            background: "#f7f9fc",
            padding: "46px 40px",
            borderRadius: 22,
            boxShadow: `${shadowCard}, 0 0 0 1px rgba(212,175,55,0.18)`,
            border: "1px solid #EEF2F8",
            overflow: "hidden",
          }}
        >
          <div style={ribbonStyle}>PREMIUM</div>

          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", margin: "0 auto 14px",
              background: gradients.brand, display: "flex", alignItems: "center", justifyContent: "center",
              border: `2px solid ${brand.gold}`,
              boxShadow: "0 10px 26px rgba(15,76,129,0.4), 0 0 22px rgba(212,175,55,0.35)",
            }}>
              <FaCrown size={24} color={brand.goldLight} />
            </div>
            <h2 style={{ color: brand.blueDeep, fontSize: 24, fontWeight: 800 }}>Welcome Back</h2>
            <p style={{ color: brand.slate, fontSize: 14, marginTop: 4 }}>
              Sign in to continue to your dashboard
            </p>
          </div>

          <label style={{ fontSize: 12, fontWeight: 700, color: brand.slate, letterSpacing: 0.5 }}>
            USERNAME
          </label>
          <div style={inputWrap("user")}>
            <FaUser color={focusField === "user" ? brand.gold : brand.slate} />
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocusField("user")}
              onBlur={() => setFocusField(null)}
              style={inputStyle}
            />
          </div>

          <label style={{ fontSize: 12, fontWeight: 700, color: brand.slate, letterSpacing: 0.5 }}>
            PASSWORD
          </label>
          <div style={inputWrap("pass")}>
            <FaLock color={focusField === "pass" ? brand.gold : brand.slate} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusField("pass")}
              onBlur={() => setFocusField(null)}
              style={inputStyle}
            />
            <span
              onClick={() => setShowPassword((v) => !v)}
              style={{ cursor: "pointer", color: brand.slate, display: "flex" }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          {error && (
            <div
              style={{
                background: "#FDECEA",
                color: brand.danger,
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: "14px",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              marginTop: 10,
              background: gradients.brand,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.8 : 1,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 0.5,
              boxShadow: "0 12px 28px rgba(15,76,129,0.4)",
              transition: "0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            {loading ? "SIGNING IN..." : "LOGIN"}
          </button>

          <div style={{
            marginTop: 22, paddingTop: 18, borderTop: "1px solid #EEF2F8",
            textAlign: "center", fontSize: 12, color: brand.slate,
          }}>
            Blue Farm &amp; Blue Remounts • Finance Management System
          </div>
        </form>
      </div>
    </div>
  );
}
