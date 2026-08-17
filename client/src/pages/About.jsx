import MainLayout from "../layouts/MainLayout";
import { Box, Typography } from "@mui/material";
import {GiCow, GiHorseHead} from "react-icons/gi";
import { brand, gradients } from "../theme";

export default function About() {
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const isRemounts = farm === "Blue Remounts";
  const Icon = isRemounts ? GiHorseHead : GiCow;
  const farmGradient = isRemounts ? gradients.blueRemounts : gradients.blueFarm;

  return (
    <MainLayout>
      <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
        <Box
          sx={{
            width: "100%",
            maxWidth: 560,
            borderRadius: 5,
            overflow: "hidden",
            background: gradients.brand,
            color: "#fff",
            textAlign: "center",
            boxShadow: "0 25px 60px rgba(8,33,63,0.4)",
            position: "relative",
          }}
        >
          <Box sx={{
            position: "absolute", top: -100, right: -80, width: 260, height: 260,
            borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.25), transparent 70%)",
          }} />

          <Box sx={{ position: "relative", zIndex: 1, px: 4, py: 6 }}>
            {/* Monogram */}
            <Box sx={{
              width: 100, height: 100, borderRadius: "50%", margin: "0 auto 20px",
              background: farmGradient,
              border: `3px solid ${brand.gold}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 35px ${isRemounts ? "rgba(184,134,11,0.5)" : "rgba(30,142,90,0.5)"}`,
            }}>
              <Icon size={48} color="#fff" />
            </Box>

            <Box sx={{
              display: "inline-flex", alignItems: "center", gap: 0.8,
              px: 1.8, py: 0.5, borderRadius: 30,
              background: "rgba(212,175,55,0.15)", border: `1px solid ${brand.gold}`,
              mb: 2, fontSize: 11.5, letterSpacing: 2, fontWeight: 700, color: brand.goldLight,
            }}>OFFICIAL SYSTEM INFO
            </Box>

            <Typography variant="h4" fontWeight={800} letterSpacing={0.5} mb={0.5}>
              {farm.toUpperCase()}
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.85, mb: 4, fontWeight: 500 }}>
              Management System
            </Typography>

            <InfoLine label="Developed By" value="Muhammad Kamran" />
            <InfoLine label="Contact No" value="0309-9565960" />
            <InfoLine label="Version" value="v1.0" />
            <InfoLine label="System" value="Finance & Human Resource Management" />

            <Typography sx={{
              mt: 4, pt: 3, borderTop: "1px solid rgba(255,255,255,0.15)",
              fontStyle: "italic", opacity: 0.85, fontSize: 14.5,
            }}>
              "Growing Together, Managing Smarter."
            </Typography>
          </Box>
        </Box>
      </Box>
    </MainLayout>
  );
}

function InfoLine({ label, value }) {
  return (
    <Box sx={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: "rgba(255,255,255,0.08)", borderRadius: 2, px: 2.5, py: 1.4, mb: 1.4,
    }}>
      <Typography sx={{ fontSize: 12.5, letterSpacing: 0.5, opacity: 0.8 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700 }}>{value}</Typography>
    </Box>
  );
}
