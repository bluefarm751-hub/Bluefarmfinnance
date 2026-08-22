import MainLayout from "../layouts/MainLayout";
import { Box, Typography } from "@mui/material";
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
import { brand, gradients, diagonalPattern } from "../theme";

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

  const stats = [
    { icon: <FaUserTie size={16} />, label: "Developed By", value: "Muhammad Kamran" },
    { icon: <FaPhoneAlt size={15} />, label: "Contact No", value: "0309-9565960" },
    { icon: <FaCodeBranch size={15} />, label: "Version", value: "v1.0" },
    { icon: <FaLayerGroup size={15} />, label: "System", value: "Finance & HR Management" },
  ];

  return (
    <MainLayout>
      <Box
        sx={{
          minHeight: "100%",
          display: "flex",
          justifyContent: "center",
          p: { xs: 1, sm: 3, md: 4 },
        }}
      >
        {/* ================= OUTER PAGE CARD ================= */}
        <Box
          sx={{
            width: "100%",
            maxWidth: 1040,
            height: "fit-content",
            borderRadius: { xs: 5, sm: 6 },
            overflow: "hidden",
            background: "#fff",
            boxShadow: "0 30px 80px rgba(8,33,63,0.18), 0 0 0 1px rgba(15,76,129,0.06)",
            position: "relative",
          }}
        >
          {/* Gold top border accent spanning the whole card */}
          <Box sx={{ height: 5, background: gradients.goldLine, backgroundSize: "200% 100%", animation: "aboutShimmer 4s linear infinite" }} />

          {/* ================= HERO SECTION ================= */}
          <Box
            sx={{
              position: "relative",
              overflow: "hidden",
              background: gradients.brand,
              color: "#fff",
              textAlign: "center",
              px: { xs: 3, sm: 6 },
              py: { xs: 5, sm: 6 },
            }}
          >
            <Box sx={{ position: "absolute", inset: 0, backgroundImage: diagonalPattern, opacity: 0.6 }} />

            <Box sx={{
              position: "absolute", top: -110, right: -90, width: 300, height: 300,
              borderRadius: "50%", background: `radial-gradient(circle, ${glow}, transparent 70%)`,
              filter: "blur(2px)", animation: "aboutPulse 6s ease-in-out infinite",
            }} />
            <Box sx={{
              position: "absolute", bottom: -140, left: -100, width: 280, height: 280,
              borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.22), transparent 70%)",
            }} />

            <Box sx={{ position: "relative", zIndex: 1 }}>
              {/* Monogram */}
              <Box sx={{
                width: 104, height: 104, borderRadius: "50%", margin: "0 auto 20px",
                background: farmGradient,
                border: `3px solid ${brand.gold}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 0 0 6px rgba(255,255,255,0.06), 0 0 45px ${glow}`,
              }}>
                <Icon size={50} color="#fff" />
              </Box>

              <Box sx={{
                display: "inline-flex", alignItems: "center", gap: 0.9,
                px: 2, py: 0.6, borderRadius: 30,
                background: "rgba(212,175,55,0.15)", border: `1px solid ${brand.gold}`,
                mb: 2, fontSize: 11.5, letterSpacing: 2.2, fontWeight: 700, color: brand.goldLight,
              }}>
                <FaShieldAlt size={11} />
                OFFICIAL SYSTEM INFO
              </Box>

              <Typography variant="h4" fontWeight={800} letterSpacing={0.6} mb={0.5}>
                {farm.toUpperCase()}
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.85, mb: 1, fontWeight: 500 }}>
                Management System
              </Typography>
              <Typography sx={{ fontStyle: "italic", opacity: 0.75, fontSize: 14 }}>
                "Growing Together, Managing Smarter."
              </Typography>
            </Box>
          </Box>

          {/* ================= STATS STRIP (overlapping the hero) ================= */}
          <Box sx={{ px: { xs: 2.5, sm: 5 }, mt: { xs: -4, sm: -4.5 }, position: "relative", zIndex: 2 }}>
            <Box sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
              gap: { xs: 1.5, sm: 2 },
              background: "#fff",
              borderRadius: 4,
              p: { xs: 1.5, sm: 2 },
              boxShadow: "0 20px 45px rgba(8,33,63,0.16)",
              border: "1px solid rgba(15,76,129,0.06)",
            }}>
              {stats.map((s) => (
                <StatChip key={s.label} {...s} accentGradient={farmGradient} />
              ))}
            </Box>
          </Box>

          {/* ================= MODULES SECTION ================= */}
          <Box sx={{ px: { xs: 2.5, sm: 5 }, pt: { xs: 4.5, sm: 5 }, pb: 1 }}>
            <Box sx={{ textAlign: "center", mb: 3 }}>
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
            textAlign: "center",
            mx: { xs: 2.5, sm: 5 },
            mt: 4, pt: 2.5, pb: 3,
            borderTop: `1px solid ${brand.panel}`,
          }}>
            <Typography sx={{ fontSize: 12.5, color: brand.slate }}>
              © {new Date().getFullYear()} {farm} — All rights reserved.
            </Typography>
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
      </Box>
    </MainLayout>
  );
}

function StatChip({ icon, label, value, accentGradient }) {
  return (
    <Box sx={{
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      gap: 0.8, py: 1.4, px: 1,
      borderRadius: 3,
      transition: "background 0.2s, transform 0.2s",
      "&:hover": { background: "#f7f9fc", transform: "translateY(-2px)" },
    }}>
      <Box sx={{
        width: 38, height: 38, borderRadius: "50%", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: accentGradient, color: "#fff",
        boxShadow: "0 8px 18px rgba(15,76,129,0.25)",
      }}>
        {icon}
      </Box>
      <Typography sx={{ fontSize: 11, letterSpacing: 0.5, color: brand.slate, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: brand.ink, lineHeight: 1.3 }}>
        {value}
      </Typography>
    </Box>
  );
}

function ModuleCard({ icon, title, desc, accentGradient }) {
  return (
    <Box sx={{
      background: brand.panel,
      borderRadius: 4,
      p: 2.6,
      border: "1px solid rgba(15,76,129,0.08)",
      display: "flex",
      flexDirection: "column",
      gap: 1.4,
      transition: "transform 0.2s, box-shadow 0.2s, background 0.2s",
      "&:hover": {
        transform: "translateY(-4px)",
        background: "#fff",
        boxShadow: "0 26px 60px rgba(8,33,63,0.16)",
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
