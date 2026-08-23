import MainLayout from "../layouts/MainLayout";
import { Box, Card, Typography } from "@mui/material";
import { GiCow, GiHorseHead } from "react-icons/gi";
import {
  FaUserTie,
  FaPhoneAlt,
  FaCodeBranch,
  FaLayerGroup,
  FaShieldAlt,
  FaMoneyCheckAlt,
  FaChartLine,
  FaBook,
  FaBalanceScale,
  FaUsers,
  FaCloudUploadAlt,
} from "react-icons/fa";
import { brand, gradients, diagonalPattern, shadowCard } from "../theme";

export default function About() {
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const isRemounts = farm === "Blue Remounts";
  const Icon = isRemounts ? GiHorseHead : GiCow;
  const farmGradient = isRemounts ? gradients.blueRemounts : gradients.blueFarm;
  const glow = isRemounts ? "rgba(184,134,11,0.55)" : "rgba(30,142,90,0.55)";

  const modules = [
    {
      icon: <FaUsers size={20} />,
      title: "Payroll & HR",
      desc: "Manage employees, appointments, departments and monthly salary generation end to end.",
    },
    {
      icon: <FaMoneyCheckAlt size={20} />,
      title: "Finance",
      desc: "Track bills, contingent expenses and income with full allocation and head-wise reporting.",
    },
    {
      icon: <FaBook size={20} />,
      title: "Cash Book",
      desc: "Daily cash inflow/outflow entries with running balances, always audit-ready.",
    },
    {
      icon: <FaBalanceScale size={20} />,
      title: "Ledger",
      desc: "Party-wise ledgers with automatic postings, balances and statement generation.",
    },
    {
      icon: <FaChartLine size={20} />,
      title: "Reports",
      desc: "Salary, bill and info reports that summarize activity across the whole system instantly.",
    },
    {
      icon: <FaCloudUploadAlt size={20} />,
      title: "Secure Storage",
      desc: "Employee documents and bill pictures are stored persistently and never lost on redeploy.",
    },
  ];

  return (
    <MainLayout>
      <Box sx={{ p: { xs: 1, sm: 3 } }}>
        {/* ================= OUTER PAGE CARD ================= */}
        <Card elevation={4} sx={{ borderRadius: 6, overflow: "hidden" }}>
      <Box
        sx={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          p: { xs: 2, sm: 4 },
          gap: { xs: 3, sm: 4 },
        }}
      >
        {/* ================= HERO CARD (nested) ================= */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 640,
            borderRadius: 6,
            overflow: "hidden",
            background: gradients.brand,
            color: "#fff",
            textAlign: "center",
            boxShadow: "0 30px 70px rgba(8,33,63,0.45), 0 0 0 1px rgba(212,175,55,0.25)",
            position: "relative",
          }}
        >
          {/* Decorative hairline texture */}
          <Box sx={{ position: "absolute", inset: 0, backgroundImage: diagonalPattern, opacity: 0.6 }} />

          {/* Glow blobs */}
          <Box sx={{
            position: "absolute", top: -110, right: -90, width: 300, height: 300,
            borderRadius: "50%", background: `radial-gradient(circle, ${glow}, transparent 70%)`,
            filter: "blur(2px)", animation: "aboutPulse 6s ease-in-out infinite",
          }} />
          <Box sx={{
            position: "absolute", bottom: -120, left: -100, width: 260, height: 260,
            borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.22), transparent 70%)",
          }} />

          {/* Gold top border accent */}
          <Box sx={{ height: 5, background: gradients.goldLine, backgroundSize: "200% 100%", animation: "aboutShimmer 4s linear infinite" }} />

          <Box sx={{ position: "relative", zIndex: 1, px: { xs: 3, sm: 5 }, py: 6 }}>
            {/* Monogram */}
            <Box sx={{
              width: 112, height: 112, borderRadius: "50%", margin: "0 auto 22px",
              background: farmGradient,
              border: `3px solid ${brand.gold}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 0 6px rgba(255,255,255,0.06), 0 0 45px ${glow}`,
              position: "relative",
            }}>
              <Icon size={54} color="#fff" />
            </Box>

            <Box sx={{
              display: "inline-flex", alignItems: "center", gap: 0.9,
              px: 2, py: 0.6, borderRadius: 30,
              background: "rgba(212,175,55,0.15)", border: `1px solid ${brand.gold}`,
              mb: 2.2, fontSize: 11.5, letterSpacing: 2.2, fontWeight: 700, color: brand.goldLight,
            }}>
              <FaShieldAlt size={11} />
              OFFICIAL SYSTEM INFO
            </Box>

            <Typography variant="h4" fontWeight={800} letterSpacing={0.6} mb={0.5}>
              {farm.toUpperCase()}
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.85, mb: 4, fontWeight: 500 }}>
              Management System
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.4 }}>
              <InfoLine icon={<FaUserTie size={14} />} label="Developed By" value="Muhammad Kamran" />
              <InfoLine icon={<FaPhoneAlt size={13} />} label="Contact No" value="0309-9565960" />
              <InfoLine icon={<FaCodeBranch size={13} />} label="Version" value="v1.0" />
              <InfoLine icon={<FaLayerGroup size={13} />} label="System" value="Finance & Human Resource Management" />
            </Box>

            <Box sx={{
              mt: 4.5, pt: 3, borderTop: "1px solid rgba(255,255,255,0.15)",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
            }}>
              <Typography sx={{ fontStyle: "italic", opacity: 0.85, fontSize: 14.5 }}>
                "Growing Together, Managing Smarter."
              </Typography>
              <Box sx={{ display: "flex", gap: 0.7 }}>
                {[0, 1, 2].map((i) => (
                  <Box key={i} sx={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: brand.gold, opacity: 0.6 + i * 0.15,
                  }} />
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* ================= MODULES SECTION ================= */}
        <Box sx={{ width: "100%", maxWidth: 980 }}>
          <Box sx={{ textAlign: "center", mb: 2.5 }}>
            <Typography sx={{
              fontSize: 11.5, letterSpacing: 2.4, fontWeight: 800,
              color: brand.blueDeep, opacity: 0.75, mb: 0.6,
            }}>
              WHAT THIS SYSTEM COVERS
            </Typography>
            <Typography variant="h5" fontWeight={800} color={brand.ink}>
              System Modules
            </Typography>
          </Box>

          <Box sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
            gap: 2.2,
          }}>
            {modules.map((m) => (
              <ModuleCard key={m.title} {...m} accentGradient={farmGradient} />
            ))}
          </Box>
        </Box>

        {/* ================= FOOTER STRIP ================= */}
        <Box sx={{
          width: "100%", maxWidth: 980, textAlign: "center",
          pt: 1, pb: 3, opacity: 0.6,
        }}>
          <Typography sx={{ fontSize: 12.5, color: brand.slate }}>
            © {new Date().getFullYear()} {farm} — All rights reserved.
          </Typography>
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
      </Box>
        </Card>
      </Box>
    </MainLayout>
  );
}

function InfoLine({ icon, label, value }) {
  return (
    <Box sx={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: "rgba(255,255,255,0.08)", borderRadius: 2.5, px: 2.5, py: 1.5,
      border: "1px solid rgba(255,255,255,0.08)",
      transition: "background 0.2s, transform 0.2s",
      "&:hover": { background: "rgba(255,255,255,0.13)", transform: "translateY(-1px)" },
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.1 }}>
        <Box sx={{
          width: 26, height: 26, borderRadius: "50%", display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "rgba(212,175,55,0.18)", color: brand.goldLight,
        }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: 12.5, letterSpacing: 0.5, opacity: 0.85 }}>{label}</Typography>
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{value}</Typography>
    </Box>
  );
}

function ModuleCard({ icon, title, desc, accentGradient }) {
  return (
    <Box sx={{
      background: "#fff",
      borderRadius: 4,
      p: 2.6,
      boxShadow: shadowCard,
      border: "1px solid rgba(15,76,129,0.08)",
      display: "flex",
      flexDirection: "column",
      gap: 1.4,
      transition: "transform 0.2s, box-shadow 0.2s",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: "0 26px 60px rgba(8,33,63,0.22)",
      },
    }}>
      <Box sx={{
        width: 44, height: 44, borderRadius: 2.5,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: accentGradient, color: "#fff",
        boxShadow: "0 10px 22px rgba(15,76,129,0.28)",
      }}>
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 800, fontSize: 15.5, color: brand.ink }}>
        {title}
      </Typography>
      <Typography sx={{ fontSize: 13, color: brand.slate, lineHeight: 1.55 }}>
        {desc}
      </Typography>
    </Box>
  );
}
