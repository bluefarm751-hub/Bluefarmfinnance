import MainLayout from "../layouts/MainLayout";
import { Box, Typography } from "@mui/material";
import { GiCow, GiHorseHead } from "react-icons/gi";
import {
  FaUserTie,
  FaPhoneAlt,
  FaCodeBranch,
  FaLayerGroup,
  FaShieldAlt,
} from "react-icons/fa";
import { brand, gradients, diagonalPattern, shadowCard } from "../theme";

export default function About() {
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const isRemounts = farm === "Blue Remounts";
  const Icon = isRemounts ? GiHorseHead : GiCow;
  const farmGradient = isRemounts ? gradients.blueRemounts : gradients.blueFarm;
  const glow = isRemounts ? "rgba(184,134,11,0.55)" : "rgba(30,142,90,0.55)";

  return (
    <MainLayout>
      {/* ================= PAGE CARD — fills the content area as one big card ================= */}
      <Box
        sx={{
          height: "100%",
          p: { xs: 1, sm: 2 },
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            borderRadius: 5,
            background: "#ffffff",
            boxShadow: shadowCard,
            border: "1px solid rgba(15,76,129,0.08)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: { xs: 2, sm: 4 },
          }}
        >
          {/* ================= SMALL ABOUT CARD, centered inside the big page card ================= */}
          <Box
            sx={{
              width: "100%",
              maxWidth: 480,
              borderRadius: 4,
              overflow: "hidden",
              background: gradients.brand,
              color: "#fff",
              textAlign: "center",
              boxShadow: "0 18px 40px rgba(8,33,63,0.4), 0 0 0 1px rgba(212,175,55,0.25)",
              position: "relative",
            }}
          >
            {/* Decorative hairline texture */}
            <Box sx={{ position: "absolute", inset: 0, backgroundImage: diagonalPattern, opacity: 0.6 }} />

            {/* Glow blobs */}
            <Box sx={{
              position: "absolute", top: -70, right: -60, width: 180, height: 180,
              borderRadius: "50%", background: `radial-gradient(circle, ${glow}, transparent 70%)`,
              filter: "blur(2px)", animation: "aboutPulse 6s ease-in-out infinite",
            }} />
            <Box sx={{
              position: "absolute", bottom: -80, left: -70, width: 160, height: 160,
              borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.22), transparent 70%)",
            }} />

            {/* Gold top border accent */}
            <Box sx={{ height: 3, background: gradients.goldLine, backgroundSize: "200% 100%", animation: "aboutShimmer 4s linear infinite" }} />

            <Box sx={{ position: "relative", zIndex: 1, px: 3, py: 3 }}>
              {/* Monogram */}
              <Box sx={{
                width: 66, height: 66, borderRadius: "50%", margin: "0 auto 12px",
                background: farmGradient,
                border: `2px solid ${brand.gold}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 0 4px rgba(255,255,255,0.06), 0 0 26px ${glow}`,
              }}>
                <Icon size={32} color="#fff" />
              </Box>

              <Box sx={{
                display: "inline-flex", alignItems: "center", gap: 0.7,
                px: 1.4, py: 0.35, borderRadius: 30,
                background: "rgba(212,175,55,0.15)", border: `1px solid ${brand.gold}`,
                mb: 1.2, fontSize: 9.5, letterSpacing: 1.6, fontWeight: 700, color: brand.goldLight,
              }}>
                <FaShieldAlt size={9} />
                OFFICIAL SYSTEM INFO
              </Box>

              <Typography variant="h5" fontWeight={800} letterSpacing={0.5} mb={0.2}>
                {farm.toUpperCase()}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.85, mb: 2, fontWeight: 500 }}>
                Management System
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
                <InfoLine icon={<FaUserTie size={12} />} label="Developed By" value="Muhammad Kamran" />
                <InfoLine icon={<FaPhoneAlt size={11} />} label="Contact No" value="0309-9565960" />
                <InfoLine icon={<FaCodeBranch size={11} />} label="Version" value="v1.0" />
                <InfoLine icon={<FaLayerGroup size={11} />} label="System" value="Finance & HR" />
              </Box>

              <Box sx={{
                mt: 2, pt: 1.6, borderTop: "1px solid rgba(255,255,255,0.15)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 0.6,
              }}>
                <Typography sx={{ fontStyle: "italic", opacity: 0.85, fontSize: 12 }}>
                  "Growing Together, Managing Smarter."
                </Typography>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  {[0, 1, 2].map((i) => (
                    <Box key={i} sx={{
                      width: 4, height: 4, borderRadius: "50%",
                      background: brand.gold, opacity: 0.6 + i * 0.15,
                    }} />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <style>{`
        @keyframes aboutShimmer {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        @keyframes aboutPulse {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.08); }
        }
      `}</style>
    </MainLayout>
  );
}

function InfoLine({ icon, label, value }) {
  return (
    <Box sx={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: "rgba(255,255,255,0.08)", borderRadius: 2, px: 1.6, py: 0.9,
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
        <Box sx={{
          width: 20, height: 20, borderRadius: "50%", display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "rgba(212,175,55,0.18)", color: brand.goldLight,
        }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: 11, letterSpacing: 0.3, opacity: 0.85 }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 12 }}>{value}</Typography>
    </Box>
  );
}
