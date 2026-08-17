import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Grid, Tab, Tabs, Typography } from "@mui/material";
import { FaUniversity, FaWallet, FaReceipt, FaCoins, FaBuilding } from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import SideTab from "../components/CashBook/SideTab";
import WithdrawalTab from "../components/CashBook/WithdrawalTab";
import BankDepositTab from "../components/CashBook/BankDepositTab";
import HORemittanceTab from "../components/CashBook/HORemittanceTab";
import DailyClosingTab from "../components/CashBook/DailyClosingTab";
import ReportsTab from "../components/CashBook/ReportsTab";
import { money } from "../components/CashBook/ui";
import { getCashSummary } from "../api/cashbookApi";
import { useToast } from "../utils/useToast";
import { brand, shadowCard } from "../theme";

const TABS = [
  "Receipt Side",
  "Payment Side",
  "Cash Withdrawal",
  "Bank Deposit",
  "HQ Remittance",
  "Daily Closing",
  "Cash Reports",
];

export default function CashBook() {
  const { showToast, ToastUI } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab ?? 0);
  const [summary, setSummary] = useState(null);

  const loadSummary = useCallback(async () => {
    try {
      const res = await getCashSummary();
      setSummary(res.data);
    } catch (e) {
      console.log(e);
    }
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    if (typeof location.state?.tab === "number") setTab(location.state.tab);
  }, [location.state]);

  const cards = [
    {
      label: "Cash in Bank",
      value: money(summary?.cashInBank),
      icon: <FaUniversity size={26} />,
      gradient: "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)",
      note: "Shared account — both farms",
    },
    {
      label: "Cash in Hand",
      value: money(summary?.cashInHand),
      icon: <FaWallet size={26} />,
      gradient: "linear-gradient(135deg, #2FBF71 0%, #1B8A50 100%)",
      note: `Safe limit ${money(summary?.safeLimit || 500000)}`,
    },
    {
      label: "Bank Deposited",
      value: money(summary?.totalBankDeposited),
      icon: <FaUniversity size={26} />,
      gradient: "linear-gradient(135deg, #D9B64A 0%, #B8912C 100%)",
      note: "Cash → Bank deposits",
    },
    {
      label: "Sent to HQ",
      value: money(summary?.totalHoRemitted),
      icon: <FaBuilding size={26} />,
      gradient: "linear-gradient(135deg, #F0574D 0%, #C0392B 100%)",
      note: "Permanent transfer to HQ",
    },
    {
      label: "Temporary Receipts (TR)",
      value: money(summary?.trOutstanding),
      icon: <FaReceipt size={26} />,
      gradient: "linear-gradient(135deg, #D9B64A 0%, #B8912C 100%)",
      note: "Outstanding (from Finance)",
    },
    {
      label: "Total Balance",
      value: money(summary?.totalBalance),
      icon: <FaCoins size={26} />,
      gradient: "linear-gradient(135deg, #A24BD1 0%, #7A1FA2 100%)",
      note: "Bank + Hand + TR",
    },
  ];

  const changeTab = (_e, v) => {
    setTab(v);
    navigate(".", { replace: true, state: { tab: v } });
  };

  const refresh = () => loadSummary();

  return (
    <MainLayout>
      <Box sx={{ p: 1 }}>
        {/* Colorful Welcome Banner — matches Employees / Finance dashboards */}
        <Box sx={{
          textAlign: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)",
          borderRadius: 4,
          py: 5,
          px: 3,
          mb: 4,
          border: "3px solid #D4AF37",
          boxShadow: "0 10px 40px rgba(102, 126, 234, 0.4), inset 0 2px 4px rgba(255,255,255,0.2)",
          position: "relative",
          overflow: "hidden",
        }}>
          <Box sx={{
            position: "absolute", top: -40, left: -40, width: 120, height: 120,
            borderRadius: "50%", background: "rgba(255,255,255,0.15)",
          }} />
          <Box sx={{
            position: "absolute", bottom: -30, right: -30, width: 100, height: 100,
            borderRadius: "50%", background: "rgba(255,255,255,0.1)",
          }} />

          <Typography sx={{ color: "#fff", fontSize: 15, mb: 0.5, position: "relative", zIndex: 1, textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
            Welcome to
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ color: "#fff", mb: 0.5, position: "relative", zIndex: 1, textShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
            Cash Book
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: 15, position: "relative", zIndex: 1, textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
            Blue Farm and Blue Remounts share one bank account — all transactions of both farms appear here automatically
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {cards.map((c) => (
            <Grid item xs={12} sm={6} md={2} key={c.label}>
              <Box sx={{
                borderRadius: 4, boxShadow: shadowCard, background: c.gradient, color: "#fff",
                height: 200, p: 3, display: "flex", flexDirection: "column", justifyContent: "space-between",
                border: "2px solid rgba(255,255,255,0.25)", position: "relative", overflow: "hidden",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-6px)",
                  boxShadow: "0 18px 45px rgba(8, 33, 63, 0.45)",
                },
              }}>
                <Box sx={{
                  width: 58, height: 58, borderRadius: "50%", background: "rgba(255,255,255,0.22)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid rgba(255,255,255,0.3)",
                }}>
                  {c.icon}
                </Box>
                <Box>
                  <Typography fontSize={16} fontWeight={600} sx={{ opacity: 0.95 }}>{c.label}</Typography>
                  <Typography variant="h4" fontWeight="bold">{c.value}</Typography>
                  <Typography fontSize={12} sx={{ opacity: 0.9, mt: 0.3 }}>{c.note}</Typography>
                </Box>
                <Box sx={{
                  position: "absolute", right: -20, bottom: -20, width: 130, height: 130,
                  borderRadius: "50%", background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }} />
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{
          borderRadius: 4, background: "linear-gradient(135deg, #0F4C81 0%, #16608f 100%)", mb: 3, p: 1,
          boxShadow: "0 10px 28px rgba(8,33,63,0.22)",
        }}>
          <Tabs
            value={tab}
            onChange={changeTab}
            variant="scrollable"
            scrollButtons="auto"
            TabIndicatorProps={{ style: { display: "none" } }}
            sx={{
              minHeight: 46,
              "& .MuiTab-root": {
                fontWeight: 800, fontSize: 13, textTransform: "none", color: "rgba(255,255,255,0.75)",
                minHeight: 46, borderRadius: 3, mx: 0.4, transition: "all 0.2s",
              },
              "& .Mui-selected": {
                color: `${brand.ink} !important`,
                background: brand.gold,
              },
            }}
          >
            {TABS.map((t) => <Tab key={t} label={t} />)}
          </Tabs>
        </Box>

        {tab === 0 && <SideTab side="receipt" onChanged={refresh} showToast={showToast} />}
        {tab === 1 && <SideTab side="payment" onChanged={refresh} showToast={showToast} />}
        {tab === 2 && <WithdrawalTab summary={summary} onChanged={refresh} showToast={showToast} />}
        {tab === 3 && <BankDepositTab summary={summary} onChanged={refresh} showToast={showToast} />}
        {tab === 4 && <HORemittanceTab summary={summary} onChanged={refresh} showToast={showToast} />}
        {tab === 5 && <DailyClosingTab onChanged={refresh} showToast={showToast} />}
        {tab === 6 && <ReportsTab />}
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
