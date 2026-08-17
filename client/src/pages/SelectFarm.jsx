import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {GiWheat, GiHorseshoe, GiPadlock} from "react-icons/gi";
import { brand, gradients, diagonalPattern, ribbonStyle } from "../theme";
import LockedDialog from "../components/LockedDialog";
import blueFarmLogo from "../assets/blue-farm-logo.png";
import blueRemountsLogo from "../assets/blue-remounts-logo.png";

export default function SelectFarm() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [lockedOpen, setLockedOpen] = useState(false);

  const auth = JSON.parse(localStorage.getItem("auth") || "null");
  const isAdmin = auth?.role === "admin";
  const myFarm = auth?.farm || null;

  const openFarm = (farmKey, locked) => {
    if (locked) {
      setLockedOpen(true);
      return;
    }
    localStorage.setItem("farm", farmKey);
    navigate("/loading");
  };

  const farms = [
    {
      key: "Blue Farm",
      title: "BLUE FARM",
      subtitle: "Agriculture & Dairy Division",
      logo: blueFarmLogo,
      accentIcon: GiWheat,
      gradient: gradients.blueFarm,
      glow: "rgba(30,142,90,0.45)",
    },
    {
      key: "Blue Remounts",
      title: "BLUE REMOUNTS",
      subtitle: "Equestrian & Cavalry Division",
      logo: blueRemountsLogo,
      accentIcon: GiHorseshoe,
      gradient: gradients.blueRemounts,
      glow: "rgba(184,134,11,0.5)",
    },
  ];

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
      <div style={{ position: "absolute", inset: 0, background: diagonalPattern, pointerEvents: "none" }} />

      <div style={{
        position: "absolute", top: -160, right: -140, width: 420, height: 420,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.18), transparent 70%)"
      }} />
      <div style={{
        position: "absolute", bottom: -180, left: -140, width: 460, height: 460,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(10,143,220,0.25), transparent 70%)"
      }} />

      <div style={{ position: "relative", zIndex: 1, width: 940, maxWidth: "92vw" }}>

        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 18px", borderRadius: 30,
            background: "rgba(212,175,55,0.15)", border: `1px solid ${brand.gold}`,
            marginBottom: 16, fontSize: 12, letterSpacing: 2, fontWeight: 700, color: brand.goldLight,
          }}>{isAdmin ? "SELECT YOUR DIVISION" : "YOUR DIVISION"}
          </div>
          <h1 style={{ color: "#fff", fontSize: 38, fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>
            BLUE FARM
          </h1>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 10,
          }}>
            <span style={{ width: 34, height: 1, background: "rgba(212,175,55,0.6)" }} />
            <span style={{ color: brand.goldLight, fontSize: 15, fontWeight: 800, letterSpacing: 4 }}>
              MANAGEMENT SYSTEM
            </span>
            <span style={{ width: 34, height: 1, background: "rgba(212,175,55,0.6)" }} />
          </div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15 }}>
            {isAdmin ? "Choose a farm to continue to its dashboard" : `Signed in as ${auth?.name || "User"}`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 34 }}>
          {farms.map((farm) => {
            const Accent = farm.accentIcon;
            const isHovered = hovered === farm.key;
            const locked = !isAdmin && myFarm !== farm.key;

            return (
              <div
                key={farm.key}
                onClick={() => openFarm(farm.key, locked)}
                onMouseEnter={() => setHovered(farm.key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  flex: 1,
                  cursor: "pointer",
                  borderRadius: 26,
                  padding: "3px",
                  background: isHovered ? gradients.goldLine : "rgba(255,255,255,0.08)",
                  transition: "0.3s",
                  transform: isHovered && !locked ? "translateY(-10px)" : "translateY(0)",
                  boxShadow: isHovered && !locked ? `0 25px 55px ${farm.glow}` : "0 10px 30px rgba(0,0,0,0.25)",
                }}
              >
                <div style={{
                  position: "relative",
                  borderRadius: 24,
                  overflow: "hidden",
                  background: farm.gradient,
                  padding: "48px 30px",
                  textAlign: "center",
                  color: "#fff",
                  minHeight: 300,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {/* faint background accent icon */}
                  <Accent
                    size={170}
                    style={{
                      position: "absolute", right: -30, bottom: -30, opacity: 0.12, transform: "rotate(-12deg)",
                    }}
                  />

                  {/* premium glass sheen */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(155deg, rgba(255,255,255,0.16), transparent 55%)",
                    pointerEvents: "none",
                  }} />

                  {!locked && <div style={ribbonStyle}>PREMIUM</div>}

                  {/* darken overlay for locked cards, deepens further on hover */}
                  {locked && (
                    <div style={{
                      position: "absolute", inset: 0,
                      background: isHovered ? "rgba(5,10,20,0.72)" : "rgba(5,10,20,0.55)",
                      transition: "0.3s",
                      zIndex: 1,
                    }} />
                  )}

                  <div style={{ position: "relative", width: 110, height: 110, marginBottom: 22 }}>
                    {!locked && (
                      <div style={{
                        position: "absolute", inset: -9, borderRadius: "50%",
                        border: `1.5px dashed ${brand.goldLight}`, opacity: isHovered ? 0.85 : 0.45,
                        animation: "spinSlow 10s linear infinite",
                        transition: "0.3s",
                      }} />
                    )}
                    <div style={{
                      position: "absolute", inset: 0, borderRadius: "50%",
                      background: "rgba(255,255,255,0.14)",
                      border: `2px solid ${locked ? "rgba(255,255,255,0.4)" : brand.gold}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: isHovered && !locked ? `0 0 30px ${farm.glow}` : "none",
                      transition: "0.3s",
                      zIndex: 2,
                      overflow: "hidden",
                    }}>
                      {locked ? <GiPadlock size={46} color="#fff" /> : (
                        <img src={farm.logo} alt={farm.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                  </div>

                  <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1, marginBottom: 8, position: "relative", zIndex: 2 }}>
                    {farm.title}
                  </h2>
                  <p style={{ fontSize: 13.5, opacity: 0.9, position: "relative", zIndex: 2 }}>
                    {locked ? "Locked by Admin" : farm.subtitle}
                  </p>

                  <div style={{
                    marginTop: 22,
                    padding: "8px 22px",
                    borderRadius: 30,
                    background: "rgba(0,0,0,0.18)",
                    border: `1px solid rgba(255,255,255,0.3)`,
                    fontSize: 12.5,
                    fontWeight: 700,
                    letterSpacing: 1,
                    position: "relative",
                    zIndex: 2,
                  }}>
                    {locked ? "🔒 NO ACCESS" : (isHovered ? "ENTER →" : "TAP TO OPEN")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <LockedDialog
        open={lockedOpen}
        onClose={() => setLockedOpen(false)}
        tabName="This farm"
      />

      <style>{`
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
