import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaCog,
  FaUserCircle,
  FaCalendarAlt,
  FaSignOutAlt,
} from "react-icons/fa";
import { brand } from "../theme";
import { logout } from "../api/authApi";

export default function Header() {
  const navigate = useNavigate();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const auth = JSON.parse(localStorage.getItem("auth") || "null");
  const userName = auth?.name || "User";
  const userRole = auth?.role === "admin" ? "System Administrator" : "Farm Office";

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const handleLogout = () => {
    logout(); // best-effort — invalidates the session token server-side
    localStorage.removeItem("auth");
    localStorage.removeItem("farm");
    localStorage.removeItem("token");
    delete axios.defaults.headers.common.Authorization;
    navigate("/");
  };

  return (
    <header
      style={{
        height: "78px",
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(10px)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 30px",
        borderBottom: `2px solid ${brand.gold}33`,
        boxShadow: "0 6px 22px rgba(15,76,129,0.10)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div>
          <h2 style={{ margin: 0, color: brand.blueDeep, fontSize: "22px", fontWeight: 800 }}>
            {farm} Management System
          </h2>
          <div style={{ color: "#6B7280", fontSize: "12.5px", marginTop: "2px" }}>
            Human Resource &amp; Finance Management
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#555",
            fontSize: "13.5px",
            background: "#e0e8f5",
            padding: "8px 14px",
            borderRadius: "20px",
          }}
        >
          <FaCalendarAlt color={brand.blueDeep} />
          {today}
        </div>

        <IconBtn><FaBell size={18} color={brand.blueDeep} /></IconBtn>
        <IconBtn><FaCog size={18} color={brand.blueDeep} /></IconBtn>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: `linear-gradient(135deg, ${brand.blueDeep}, ${brand.blueBright})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${brand.gold}`,
          }}>
            <FaUserCircle size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: "700", color: "#111827", fontSize: 14 }}>{userName}</div>
            <div style={{ fontSize: "11.5px", color: "#6B7280" }}>{userRole}</div>
          </div>
        </div>

        {/* Logout Button */}
        <div
          onClick={handleLogout}
          title="Logout"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            borderRadius: "10px",
            cursor: "pointer",
            color: "#fff",
            background: "linear-gradient(135deg, #C0392B, #E74C3C)",
            fontWeight: 600,
            fontSize: "13px",
            transition: "0.2s",
            boxShadow: "0 3px 10px rgba(192,57,43,0.3)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(192,57,43,0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 3px 10px rgba(192,57,43,0.3)";
          }}
        >
          <FaSignOutAlt size={14} />
          Logout
        </div>
      </div>
    </header>
  );
}

function IconBtn({ children }) {
  return (
    <div
      style={{
        width: 38, height: 38, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#e0e8f5", cursor: "pointer", transition: "0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#d0dbf0")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#e0e8f5")}
    >
      {children}
    </div>
  );
}
