import { Box, Button, Grid, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { FaBook, FaBalanceScale, FaFileInvoiceDollar, FaFileAlt } from "react-icons/fa";

const TABS = [
  { label: "Main Ledger", path: "/ledger/general", icon: <FaBook />, gradient: "linear-gradient(135deg,#1E88E5 0%,#1565C0 100%)" },
  { label: "Party Ledger", path: "/ledger/party", icon: <FaBalanceScale />, gradient: "linear-gradient(135deg,#2FBF71 0%,#1B8A50 100%)" },
  { label: "Balance Sheet", path: "/ledger/balance-sheet", icon: <FaFileInvoiceDollar />, gradient: "linear-gradient(135deg,#A24BD1 0%,#7A1FA2 100%)" },
  { label: "Report Ledger", path: "/ledger/report-excel", icon: <FaFileAlt />, gradient: "linear-gradient(135deg,#F0574D 0%,#C0392B 100%)" },
  { label: "Report Party Ledger", path: "/ledger/party-report-excel", icon: <FaFileAlt />, gradient: "linear-gradient(135deg,#D9B64A 0%,#B8912C 100%)" },
  { label: "Report Balance Sheet", path: "/ledger/balance-sheet-report", icon: <FaFileAlt />, gradient: "linear-gradient(135deg,#16608f 0%,#12507a 100%)" },
];

export default function Ledger() {
  const navigate = useNavigate();
  const farm = localStorage.getItem("farm") || "Blue Farm";

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 4 }}>
        <Box sx={{
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)",
          borderRadius: 4, py: 5, px: 3, mb: 4,
          border: "3px solid #D4AF37",
          boxShadow: "0 10px 40px rgba(102,126,234,0.4), inset 0 2px 4px rgba(255,255,255,0.2)",
          position: "relative", overflow: "hidden",
        }}>
          <Box sx={{ position: "absolute", top: -40, left: -40, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
          <Box sx={{ position: "absolute", bottom: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
          <Typography sx={{ color: "#fff", fontSize: 15, mb: 0.5, position: "relative", zIndex: 1 }}>Welcome to</Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ color: "#fff", mb: 0.5, position: "relative", zIndex: 1, textShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
            {farm} Ledger
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.92)", fontSize: 15, position: "relative", zIndex: 1 }}>
            Main Ledger, Party Ledger, Balance Sheet &amp; Reports
          </Typography>
        </Box>

        <Typography variant="h5" fontWeight={800} mb={2}>Ledger Sections</Typography>
        <Grid container spacing={2.5}>
          {TABS.map((tab) => (
            <Grid item xs={12} sm={6} md={4} key={tab.path}>
              <Box sx={{
                borderRadius: 3.5, background: tab.gradient, color: "#fff", p: 2.5, minHeight: 145,
                display: "flex", flexDirection: "column", justifyContent: "space-between",
                boxShadow: "0 10px 28px rgba(8,33,63,0.22)", border: "2px solid rgba(255,255,255,0.25)",
                transition: "transform .2s, box-shadow .2s",
                "&:hover": { transform: "translateY(-5px)", boxShadow: "0 16px 35px rgba(8,33,63,0.32)" },
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box sx={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 21 }}>
                    {tab.icon}
                  </Box>
                  <Typography fontWeight={900}>{tab.label}</Typography>
                </Box>
                <Button variant="contained" onClick={() => navigate(tab.path)} sx={{ alignSelf: "flex-start", mt: 2, background: "rgba(255,255,255,.2)", color: "#fff", border: "1px solid rgba(255,255,255,.35)", "&:hover": { background: "rgba(255,255,255,.32)" } }}>
                  Open
                </Button>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </MainLayout>
  );
}
