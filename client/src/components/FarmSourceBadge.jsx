import { Box, Typography } from "@mui/material";
import { GiWheat, GiHorseshoe } from "react-icons/gi";
import { gradients } from "../theme";

// Fixed, non-editable software/source indicator shown at the top of every
// auto-posting Cash Book form (Add Bill, Add Income, Add Allocation, Cash
// Withdrawal, Bank Deposit). The farm is never picked manually here — it is
// always the farm this software instance is running as (chosen once on the
// Select Farm screen and stored in localStorage), exactly like the fixed
// BLUE FARM / BLUE REMOUNTS box requested for every automatic entry.
const FARM_LABELS = { "Blue Farm": "BLUE FARM", "Blue Remounts": "BLUE REMOUNTS" };

export default function FarmSourceBadge({ type }) {
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const label = FARM_LABELS[farm] || farm.toUpperCase();
  const isRemounts = farm === "Blue Remounts";
  const gradient = isRemounts ? gradients.blueRemounts : gradients.blueFarm;
  const Icon = isRemounts ? GiHorseshoe : GiWheat;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        borderRadius: 3,
        p: "12px 20px",
        mb: 2.5,
        background: gradient,
        color: "#fff",
        boxShadow: "0 8px 22px rgba(8,33,63,0.28)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Icon size={80} style={{ position: "absolute", right: -14, bottom: -18, opacity: 0.14, transform: "rotate(-10deg)" }} />

      <Box sx={{ position: "relative", zIndex: 1 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.5, opacity: 0.85 }}>
          SOFTWARE / SOURCE — FIXED
        </Typography>
        <Typography sx={{ fontSize: 19, fontWeight: 900, letterSpacing: 0.5, lineHeight: 1.3 }}>
          {label}
          {type ? ` — ${type}` : ""}
        </Typography>
      </Box>

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          fontSize: 11,
          fontWeight: 800,
          px: 1.4,
          py: 0.6,
          borderRadius: 20,
          background: "rgba(255,255,255,0.18)",
          border: "1px solid rgba(255,255,255,0.4)",
          whiteSpace: "nowrap",
        }}
      >
        AUTO-DETECTED
      </Box>
    </Box>
  );
}
