import { Box, Grid, Typography } from "@mui/material";
import MainLayout from "../layouts/MainLayout";
import { FaBook, FaBalanceScale, FaFileInvoiceDollar } from "react-icons/fa";
import { shadowCard } from "../theme";

const TABS = [
  { label: "Main Ledger", path: "/ledger/general", icon: <FaBook />, gradient: "linear-gradient(135deg,#1E88E5 0%,#1565C0 100%)", text: "Heads, bills and running balances" },
  { label: "Party Ledger", path: "/ledger/party", icon: <FaBalanceScale />, gradient: "linear-gradient(135deg,#2FBF71 0%,#1B8A50 100%)", text: "Contractor-wise paid and payable balances" },
  { label: "Balance Sheet", path: "/ledger/balance-sheet", icon: <FaFileInvoiceDollar />, gradient: "linear-gradient(135deg,#A24BD1 0%,#7A1FA2 100%)", text: "Head-wise remaining and payable summary" },
];

export default function Ledger() {
  const farm = localStorage.getItem("farm") || "Blue Farm";

  return (
    <MainLayout>
      <Box sx={{ px: { xs: 1.5, md: 3 }, pt: 1, pb: 4 }}>
        <Box sx={{
          width: "100%",
          boxSizing: "border-box",
          borderRadius: 4,
          p: { xs: 2, md: 4 },
          background: "#fff",
          border: "1px solid #d9e4ec",
          boxShadow: "0 12px 35px rgba(8,33,63,0.12)",
          minHeight: "calc(100vh - 84px)",
          height: "calc(100vh - 84px)",
          flex: 1,
        }}>
          <Box sx={{
            textAlign: "center",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)",
            borderRadius: 4,
            py: { xs: 4, md: 5 },
            px: 3,
            mb: 4,
            border: "3px solid #D4AF37",
            boxShadow: "0 10px 40px rgba(102,126,234,0.32), inset 0 2px 4px rgba(255,255,255,0.2)",
            position: "relative",
            overflow: "hidden",
          }}>
            <Box sx={{ position: "absolute", top: -40, left: -40, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
            <Box sx={{ position: "absolute", bottom: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
            <Typography sx={{ color: "#fff", fontSize: 16, mb: 0.5, position: "relative", zIndex: 1 }}>Welcome to</Typography>
            <Typography variant="h3" fontWeight="bold" sx={{ color: "#fff", mb: 0.7, position: "relative", zIndex: 1, textShadow: "0 2px 6px rgba(0,0,0,0.3)", fontSize: { xs: "2rem", md: "3rem" } }}>
              {farm} Ledger
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.94)", fontSize: { xs: 14, md: 16 }, position: "relative", zIndex: 1 }}>
              Main Ledger, Party Ledger &amp; Balance Sheet
            </Typography>
          </Box>

          <Typography variant="h5" fontWeight={900} mb={2.5} sx={{ color: "#0F4C81" }}>
            Ledger Sections
          </Typography>

          <Grid container spacing={3}>
            {TABS.map((tab) => (
              <Grid item xs={12} md={4} key={tab.path}>
                <Box
                  sx={{
                    // Purely a visual summary card — Main Ledger / Party Ledger /
                    // Balance Sheet are already reachable from the sidebar's
                    // Ledger tabs, so this card intentionally does not link or
                    // navigate anywhere; no pointer cursor, no hover/focus
                    // "clickable" affordance either.
                    cursor: "default",
                    borderRadius: 4,
                    background: tab.gradient,
                    color: "#fff",
                    p: { xs: 3, md: 3.5 },
                    minHeight: { xs: 260, md: 330 },
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    textDecoration: "none",
                    position: "relative",
                    zIndex: 1,
                    overflow: "hidden",
                    boxShadow: shadowCard,
                    border: "2px solid rgba(255,255,255,0.25)",
                    outline: "none",
                  }}
                >
                  <Box sx={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, mb: 2, border: "2px solid rgba(255,255,255,.3)", position: "relative", zIndex: 1 }}>
                    {tab.icon}
                  </Box>
                  <Typography sx={{ fontWeight: 900, fontSize: { xs: 20, md: 23 }, mb: 1, position: "relative", zIndex: 1, textShadow: "0 2px 6px rgba(0,0,0,0.25)" }}>{tab.label}</Typography>
                  <Typography sx={{ color: "rgba(255,255,255,.9)", fontSize: 14, maxWidth: 280, position: "relative", zIndex: 1 }}>{tab.text}</Typography>
                  <Box sx={{ position: "absolute", right: -24, bottom: -24, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  <Box sx={{ position: "absolute", left: -30, top: -30, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.07)" }} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </MainLayout>
  );
}
