import { useEffect, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { getFinanceHeads } from "../api/financeApi";
import { useToast } from "../utils/useToast";
import {
  FaLandmark,
  FaCoins,
  FaListAlt,
  FaFileInvoiceDollar,
} from "react-icons/fa";
import { brand, shadowCard } from "../theme";

import { Box, Grid, Typography } from "@mui/material";

const CARD_GRADIENTS = [
  "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)",
  "linear-gradient(135deg, #2FBF71 0%, #1B8A50 100%)",
  "linear-gradient(135deg, #A24BD1 0%, #7A1FA2 100%)",
  "linear-gradient(135deg, #F0574D 0%, #C0392B 100%)",
  "linear-gradient(135deg, #D9B64A 0%, #B8912C 100%)",
  "linear-gradient(135deg, #16608f 0%, #12507a 100%)",
];

export default function Finance() {
  const { ToastUI } = useToast();
  const farm = localStorage.getItem("farm") || "Blue Farm";

  const [heads, setHeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHeads();
  }, []);

  const loadHeads = async () => {
    setLoading(true);
    try {
      const res = await getFinanceHeads();
      setHeads(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const totalHeads = heads.length;
  let totalAmount = 0;
  let totalSpent = 0;
  heads.forEach((h) => {
    const amt = parseFloat(h.amount);
    const spent = parseFloat(h.spent);
    totalAmount += isNaN(amt) ? 0 : amt;
    totalSpent += isNaN(spent) ? 0 : spent;
  });
  const totalRemaining = totalAmount - totalSpent;

  const summaryCards = [
    {
      label: "Total Heads",
      value: totalHeads,
      icon: <FaListAlt size={30} />,
      gradient: "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)",
    },
    {
      label: "Total Amount",
      value: `Rs. ${totalAmount.toLocaleString()}`,
      icon: <FaCoins size={30} />,
      gradient: "linear-gradient(135deg, #A24BD1 0%, #7A1FA2 100%)",
    },
    {
      label: "Bills Paid",
      value: `Rs. ${totalSpent.toLocaleString()}`,
      icon: <FaFileInvoiceDollar size={30} />,
      gradient: "linear-gradient(135deg, #F0574D 0%, #C0392B 100%)",
    },
    {
      label: "Remaining",
      value: `Rs. ${totalRemaining.toLocaleString()}`,
      icon: <FaCoins size={30} />,
      gradient: "linear-gradient(135deg, #2FBF71 0%, #1B8A50 100%)",
    },
  ];

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        {/* Colorful Welcome Card */}
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
            {farm} Finance
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: 15, position: "relative", zIndex: 1, textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
            Income, Expense &amp; Head-wise Summary
          </Typography>
        </Box>

        {/* Summary cards */}
        <Grid container spacing={3} sx={{ mb: 1 }}>
          {summaryCards.map((c) => (
            <Grid item xs={12} sm={6} md={3} key={c.label}>
              <Box sx={{
                borderRadius: 4,
                boxShadow: shadowCard,
                background: c.gradient,
                color: "#fff",
                height: 200,
                p: 3,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
                border: "2px solid rgba(255,255,255,0.25)",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-6px)",
                  boxShadow: "0 18px 45px rgba(8, 33, 63, 0.45)",
                },
              }}>
                <Box sx={{
                  width: 58, height: 58, borderRadius: "50%",
                  background: "rgba(255,255,255,0.22)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid rgba(255,255,255,0.3)",
                }}>
                  {c.icon}
                </Box>
                <Box>
                  <Typography fontSize={16} fontWeight={600} sx={{ opacity: 0.95 }}>
                    {c.label}
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {c.value}
                  </Typography>
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

        {/* Head section header */}
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between", mt: 3, mb: 2.5,
          p: 2, borderRadius: 3.5, background: "linear-gradient(135deg, #0F4C81 0%, #16608f 100%)",
          boxShadow: "0 10px 28px rgba(8,33,63,0.22)",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(255,255,255,0.3)",
            }}>
              <FaLandmark size={17} color="#fff" />
            </Box>
            <Typography variant="h6" fontWeight={800} sx={{ color: "#fff" }}>
              Finance Heads
            </Typography>
          </Box>
          <Box sx={{
            px: 1.6, py: 0.5, borderRadius: 5, background: brand.gold, color: brand.ink,
            fontWeight: 800, fontSize: 12.5,
          }}>
            {totalHeads} {totalHeads === 1 ? "Head" : "Heads"}
          </Box>
        </Box>

        {/* No heads message */}
        {!loading && heads.length === 0 && (
          <Box sx={{
            textAlign: "center", py: 6, borderRadius: 4,
            border: `1.5px dashed ${brand.gold}`, background: "rgba(212,175,55,0.06)",
          }}>
            <Typography sx={{ color: brand.slate, fontWeight: 600 }}>
              No heads added yet. Use the "Add Head" tab in the sidebar to create one.
            </Typography>
          </Box>
        )}

        {/* Head cards — show REMAINING amount (allocated - spent) */}
        <Grid container spacing={3}>
          {heads.map((h, idx) => {
            const allocated = Number(h.amount ?? 0);
            const spent = Number(h.spent ?? 0);
            const remaining = allocated - spent;

            return (
              <Grid item xs={12} sm={6} md={3} key={h.id}>
                <Box sx={{
                  borderRadius: 4,
                  boxShadow: shadowCard,
                  background: CARD_GRADIENTS[idx % CARD_GRADIENTS.length],
                  color: "#fff",
                  height: 250,
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  overflow: "hidden",
                  border: "2px solid rgba(255,255,255,0.25)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 15px 40px rgba(8, 33, 63, 0.45)",
                  },
                }}>
                  <Box sx={{
                    width: 46, height: 46, borderRadius: "50%",
                    background: "rgba(255,255,255,0.22)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid rgba(255,255,255,0.3)",
                  }}>
                    <FaCoins size={20} />
                  </Box>

                  <Box>
                    <Typography
                      fontWeight={800}
                      sx={{ fontSize: 22, lineHeight: 1.15, wordBreak: "break-word", textShadow: "0 2px 6px rgba(0,0,0,0.25)" }}
                    >
                      {h.headName}
                    </Typography>
                    {/* Balance — remaining after bills; red if overspent */}
                    <Typography sx={{ fontSize: 12.5, mt: 1, opacity: 0.8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Balance
                    </Typography>
                    <Typography fontWeight="bold" sx={{
                      fontSize: 24,
                      color: remaining >= 0 ? "#fff" : "#FFD2D2",
                    }}>
                      Rs. {remaining.toLocaleString()}
                    </Typography>
                  </Box>

                  <Box sx={{
                    position: "absolute", right: -20, bottom: -20, width: 110, height: 110,
                    borderRadius: "50%", background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }} />
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {ToastUI}
    </MainLayout>
  );
}
