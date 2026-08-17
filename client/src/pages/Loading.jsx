import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { brand, gradients, diagonalPattern } from "../theme";
import blueFarmLogo from "../assets/blue-farm-logo.png";
import blueRemountsLogo from "../assets/blue-remounts-logo.png";

export default function Loading() {
  const navigate = useNavigate();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const isRemounts = farm === "Blue Remounts";
  const logo = isRemounts ? blueRemountsLogo : blueFarmLogo;
  const farmGradient = isRemounts ? gradients.blueRemounts : gradients.blueFarm;
  const glow = isRemounts ? "rgba(184,134,11,0.55)" : "rgba(30,142,90,0.5)";

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const steps = [20, 45, 68, 86, 100];
    let i = 0;
    const interval = setInterval(() => {
      setProgress(steps[i]);
      i += 1;
      if (i >= steps.length) {
        clearInterval(interval);
        setTimeout(() => navigate("/employees"), 350);
      }
    }, 260);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        background: "linear-gradient(160deg,#0B1B33,#0F4C81 55%,#08213f)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* premium hairline texture */}
      <div style={{ position: "absolute", inset: 0, background: diagonalPattern, pointerEvents: "none" }} />

      <div style={{
        position: "absolute", top: -160, left: -140, width: 420, height: 420,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.2), transparent 70%)"
      }} />
      <div style={{
        position: "absolute", bottom: -180, right: -140, width: 460, height: 460,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(10,143,220,0.25), transparent 70%)"
      }} />

      {/* frosted premium card */}
      <div style={{
        position: "relative", zIndex: 1, textAlign: "center",
        padding: "56px 68px",
        borderRadius: 28,
        background: "rgba(255,255,255,0.045)",
        backdropFilter: "blur(18px)",
        border: "1px solid rgba(212,175,55,0.28)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
      }}>
        <div style={{ position: "relative", width: 150, height: 150, margin: "0 auto 30px" }}>
          {/* rotating dashed premium ring */}
          <div style={{
            position: "absolute", inset: -10, borderRadius: "50%",
            border: `1.5px dashed ${brand.gold}`, opacity: 0.55,
            animation: "spinSlow 9s linear infinite",
          }} />
          <div
            style={{
              position: "absolute", inset: 0,
              borderRadius: "50%",
              background: farmGradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `3px solid ${brand.gold}`,
              boxShadow: `0 0 45px ${glow}`,
              animation: "logoBounce 1.1s ease-in-out infinite",
              overflow: "hidden",
            }}
          >
            <img src={logo} alt={farm} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "5px 16px", borderRadius: 30,
          background: "rgba(212,175,55,0.15)", border: `1px solid ${brand.gold}`,
          marginBottom: 18, fontSize: 11.5, letterSpacing: 2, fontWeight: 700, color: brand.goldLight,
        }}>LOADING WORKSPACE
        </div>

        <h1 style={{
          color: "#fff", fontSize: 40, fontWeight: 800, letterSpacing: 1, marginBottom: 6, lineHeight: 1.1,
        }}>
          {farm.toUpperCase()}
        </h1>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 26,
        }}>
          <span style={{ width: 34, height: 1, background: "rgba(212,175,55,0.6)" }} />
          <span style={{
            color: brand.goldLight, fontSize: 17, fontWeight: 800, letterSpacing: 5,
          }}>MANAGEMENT SYSTEM</span>
          <span style={{ width: 34, height: 1, background: "rgba(212,175,55,0.6)" }} />
        </div>

        <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, marginBottom: 30 }}>
          Preparing your dashboard, please wait...
        </p>

        <div style={{
          width: 320, height: 10, borderRadius: 20, background: "rgba(255,255,255,0.15)",
          overflow: "hidden", margin: "0 auto", position: "relative",
        }}>
          <div style={{
            width: `${progress}%`, height: "100%", borderRadius: 20,
            background: gradients.goldLine,
            transition: "width 0.25s ease",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
              width: "40%",
              animation: "shimmer 1.3s ease-in-out infinite",
            }} />
          </div>
        </div>
        <div style={{ color: brand.goldLight, fontSize: 13, fontWeight: 700, marginTop: 10, letterSpacing: 1 }}>
          {progress}%
        </div>
      </div>

      <style>{`
        @keyframes logoBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(320%); }
        }
      `}</style>
    </div>
  );
}
