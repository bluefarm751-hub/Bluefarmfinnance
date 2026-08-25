import { Box, Tab, Tabs } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { label: "Main Ledger", path: "/ledger/general" },
  { label: "Party Ledger", path: "/ledger/party" },
  { label: "Balance Sheet", path: "/ledger/balance-sheet" },
  { label: "Report Ledger", path: "/ledger/report-excel" },
  { label: "Report Party Ledger", path: "/ledger/party-report-excel" },
  { label: "Report Balance Sheet", path: "/ledger/balance-sheet-report" },
];

export default function LedgerTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const current = tabs.findIndex((t) => location.pathname === t.path || location.pathname.startsWith(`${t.path}/`));
  const value = current >= 0 ? current : 0;
  return (
    <Box sx={{ mb: 3, borderBottom: "1px solid #d9e4ec", overflowX: "auto" }}>
      <Tabs
        value={value}
        onChange={(_, next) => navigate(tabs[next].path)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 48,
          "& .MuiTab-root": { minHeight: 48, fontWeight: 800, textTransform: "none", whiteSpace: "nowrap" },
          "& .Mui-selected": { color: "#0F4C81" },
          "& .MuiTabs-indicator": { height: 3, background: "#D4AF37" },
        }}
      >
        {tabs.map((tab) => <Tab key={tab.path} label={tab.label} />)}
      </Tabs>
    </Box>
  );
}
