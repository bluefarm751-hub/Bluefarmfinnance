import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Grid, Typography } from "@mui/material";
import {
  FaBalanceScale,
  FaBook,
  FaUsers,
  FaArrowUp,
  FaArrowDown,
  FaPlusCircle,
  FaFileExcel,
  FaFilePdf,
} from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import { getGeneralLedger, getParties } from "../api/ledgerApi";
import { useToast } from "../utils/useToast";
import { brand, shadowCard } from "../theme";
import { money } from "../components/CashBook/ui";

export default function Ledger() {
  const navigate = useNavigate();
  const { ToastUI } = useToast();
  const farm = localStorage.getItem("farm") || "Blue Farm";

  const [rows, setRows] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [led, pts] = await Promise.all([getGeneralLedger(), getParties()]);
      setRows(led.data || []);
      setParties(pts.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  let totalDebit = 0;
  let totalCredit = 0;
  rows.forEach((r) => {
    totalDebit += Number(r.debit || 0);
    totalCredit += Number(r.credit || 0);
  });
  const netBalance = totalDebit - totalCredit;

  const summaryCards = [
    { label: "Total Debit", value: money(totalDebit), icon: <FaArrowUp size={26} />, gradient: "linear-gradient(135deg, #2FBF71 0%, #1B8A50 100%)" },
    { label: "Total Credit", value: money(totalCredit), icon: <FaArrowDown size={26} />, gradient: "linear-gradient(135deg, #F0574D 0%, #C0392B 100%)" },
    { label: "Net Balance", value: money(netBalance), icon: <FaBalanceScale size={26} />, gradient: "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)" },
    { label: "Parties", value: parties.length, icon: <FaUsers size={26} />, gradient: "linear-gradient(135deg, #A24BD1 0%, #7A1FA2 100%)" },
  ];

  const navCards = [
    {
      title: "General Ledger",
      desc: "All Debit / Credit entries across the farm, in one running account.",
      icon: <FaBook size={26} />,
      to: "/ledger/general",
      gradient: "linear-gradient(135deg, #0F4C81 0%, #16608f 100%)",
    },
    {
      title: "Report Ledger",
      desc: "Export the General Ledger separately to Excel or PDF.",
      icon: <FaFileInvoiceDollar size={26} />,
      to: "/ledger/report-excel",
      gradient: "linear-gradient(135deg, #1B8A50 0%, #2FBF71 100%)",
    },
    {
      title: "Party Ledger",
      desc: "Select a party (vendor / contractor / customer) to see its own account.",
      icon: <FaBalanceScale size={26} />,
      to: "/ledger/party",
      gradient: "linear-gradient(135deg, #5C0E22 0%, #8C1B3B 100%)",
    },
    {
      title: "Report Party Ledger Excel",
      desc: "Export a selected contractor's Party Ledger separately to Excel.",
      icon: <FaFileExcel size={26} />,
      to: "/ledger/party-report-excel",
      gradient: "linear-gradient(135deg, #1B8A50 0%, #2FBF71 100%)",
    },
    {
      title: "Report Party Ledger PDF",
      desc: "Generate a selected contractor's Party Ledger separately as PDF.",
      icon: <FaFilePdf size={26} />,
      to: "/ledger/party-report-pdf",
      gradient: "linear-gradient(135deg, #C0392B 0%, #F0574D 100%)",
    },
    {
      title: "Party Head Summary Excel",
      desc: "Contractor-wise head summary with business, paid, payable and remaining.",
      icon: <FaFileExcel size={26} />,
      to: "/ledger/party-head-summary-excel",
      gradient: "linear-gradient(135deg, #1B8A50 0%, #2FBF71 100%)",
    },
    {
      title: "Party Head Summary PDF",
      desc: "Print-ready contractor-wise head summary.",
      icon: <FaFilePdf size={26} />,
      to: "/ledger/party-head-summary-pdf",
      gradient: "linear-gradient(135deg, #C0392B 0%, #F0574D 100%)",
    },
    {
      title: "Monthly Party Ledger Excel",
      desc: "Monthly contractor and head-wise Party Ledger report.",
      icon: <FaFileExcel size={26} />,
      to: "/ledger/party-monthly-excel",
      gradient: "linear-gradient(135deg, #0F4C81 0%, #16608f 100%)",
    },
    {
      title: "Monthly Party Ledger PDF",
      desc: "Monthly Party Ledger report in PDF format.",
      icon: <FaFilePdf size={26} />,
      to: "/ledger/party-monthly-pdf",
      gradient: "linear-gradient(135deg, #7A1FA2 0%, #A24BD1 100%)",
    },
    {
      title: "Balance Sheet",
      desc: "Head-wise remaining balances, with separate Excel and PDF report exports.",
      icon: <FaLandmark size={26} />,
      to: "/ledger/balance-sheet-report",
      gradient: "linear-gradient(135deg, #D9B64A 0%, #B8912C 100%)",
    },
    {
      title: "Monthly Balance Sheet Comparison",
      desc: "Compare the selected month with the previous month head-by-head.",
      icon: <FaFileExcel size={26} />,
      to: "/ledger/balance-sheet-monthly-comparison",
      gradient: "linear-gradient(135deg, #0F4C81 0%, #16608f 100%)",
    },
    {
      title: "Head-wise Contractor Breakup",
      desc: "See contractor-wise business, paid, payable and remaining under each head.",
      icon: <FaUsers size={26} />,
      to: "/ledger/balance-sheet-contractor-breakup",
      gradient: "linear-gradient(135deg, #7A1FA2 0%, #A24BD1 100%)",
    },
    {
      title: "Yearly Balance Sheet Comparison",
      desc: "Compare the selected year with the previous year head-by-head.",
      icon: <FaFileExcel size={26} />,
      to: "/ledger/balance-sheet-yearly-comparison",
      gradient: "linear-gradient(135deg, #0F4C81 0%, #16608f 100%)",
    },
    {
      title: "Head-wise Contractor Detailed PDF",
      desc: "Head-wise contractor report with every individual bill and running Party balance.",
      icon: <FaFilePdf size={26} />,
      to: "/ledger/contractor-detailed-pdf",
      gradient: "linear-gradient(135deg, #C0392B 0%, #F0574D 100%)",
    },
    {
      title: "Add Ledger Entry",
      desc: "Add a manual Debit or Credit journal entry (opening balance, adjustment, etc.)",
      icon: <FaPlusCircle size={26} />,
      to: "/ledger/add-entry",
      gradient: "linear-gradient(135deg, #D9B64A 0%, #B8912C 100%)",
    },
  ];

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 3 }}>
        {/* Colorful Welcome Card */}
        <Box sx={{
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)",
          borderRadius: 4, py: 5, px: 3, mb: 4,
          border: "3px solid #D4AF37",
          boxShadow: "0 10px 40px rgba(102, 126, 234, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)",
          position: "relative", overflow: "hidden",
        }}>
          <Box sx={{ position: "absolute", top: -40, left: -40, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
          <Box sx={{ position: "absolute", bottom: -30, right: -30, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />

          <Typography sx={{ color: "#fff", fontSize: 15, mb: 0.5, position: "relative", zIndex: 1, textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
            Welcome to
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ color: "#fff", mb: 0.5, position: "relative", zIndex: 1, textShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
            {farm} Ledger
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: 15, position: "relative", zIndex: 1, textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
            General &amp; Party-wise Debit / Credit Account
          </Typography>
        </Box>

        {/* Summary cards */}
        <Grid container spacing={3} sx={{ mb: 1 }}>
          {summaryCards.map((c) => (
            <Grid item xs={12} sm={6} md={3} key={c.label}>
              <Box sx={{
                borderRadius: 4, boxShadow: shadowCard, background: c.gradient, color: "#fff",
                height: 200, p: 3, display: "flex", flexDirection: "column", justifyContent: "space-between",
                position: "relative", overflow: "hidden", border: "2px solid rgba(255,255,255,0.25)",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": { transform: "translateY(-6px)", boxShadow: "0 18px 45px rgba(8, 33, 63, 0.45)" },
              }}>
                <Box sx={{
                  width: 58, height: 58, borderRadius: "50%", background: "rgba(255,255,255,0.22)",
                  display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,0.3)",
                }}>
                  {c.icon}
                </Box>
                <Box>
                  <Typography fontSize={16} fontWeight={600} sx={{ opacity: 0.95 }}>{c.label}</Typography>
                  <Typography variant="h4" fontWeight="bold">{c.value}</Typography>
                </Box>
                <Box sx={{ position: "absolute", right: -20, bottom: -20, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Navigation cards */}
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {navCards.map((c) => (
            <Grid item xs={12} sm={6} md={4} key={c.title}>
              <Box
                onClick={() => navigate(c.to)}
                sx={{
                  cursor: "pointer",
                  borderRadius: 4, boxShadow: shadowCard, background: c.gradient, color: "#fff",
                  height: 190, p: 3, display: "flex", flexDirection: "column", justifyContent: "space-between",
                  position: "relative", overflow: "hidden", border: "2px solid rgba(255,255,255,0.25)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": { transform: "translateY(-4px)", boxShadow: "0 15px 40px rgba(8, 33, 63, 0.45)" },
                }}
              >
                <Box sx={{
                  width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,0.22)",
                  display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,0.3)",
                }}>
                  {c.icon}
                </Box>
                <Box>
                  <Typography fontWeight={800} sx={{ fontSize: 19, mb: 0.6, textShadow: "0 2px 6px rgba(0,0,0,0.25)" }}>{c.title}</Typography>
                  <Typography sx={{ fontSize: 12.5, opacity: 0.9 }}>{c.desc}</Typography>
                </Box>
                <Box sx={{ position: "absolute", right: -20, bottom: -20, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }} />
              </Box>
            </Grid>
          ))}
        </Grid>

        {!loading && rows.length === 0 && (
          <Box sx={{ textAlign: "center", py: 6, mt: 3, borderRadius: 4, border: `1.5px dashed ${brand.gold}`, background: "rgba(212,175,55,0.06)" }}>
            <Typography sx={{ color: brand.slate, fontWeight: 600 }}>
              No ledger entries yet. Bills and receipts you add elsewhere appear here automatically,
              or use "Add Ledger Entry" to add one manually.
            </Typography>
          </Box>
        )}
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
