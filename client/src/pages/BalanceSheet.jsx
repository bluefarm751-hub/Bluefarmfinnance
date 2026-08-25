import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Grid, Typography } from "@mui/material";
import { FaBalanceScale, FaFileExcel, FaFilePdf, FaPrint, FaSync } from "react-icons/fa";
import MainLayout from "../layouts/MainLayout";
import { SectionCard } from "../components/CashBook/ui";
import { getBalanceSheet } from "../api/ledgerApi";
import { exportExcel } from "../utils/exportExcel";
import { printDocument, tableHtml } from "../utils/print";
import { useToast } from "../utils/useToast";
import { brand } from "../theme";

const fmt = (v) => `Rs. ${Number(v || 0).toLocaleString()}`;

const columns = [
  { key: "headName", label: "Head" },
  { key: "totalAmount", label: "Total Head Amount", align: "right", render: (r) => fmt(r.totalAmount) },
  { key: "billAmount", label: "Total Bills", align: "right", render: (r) => fmt(r.billAmount) },
  { key: "paidAmount", label: "Paid", align: "right", render: (r) => fmt(r.paidAmount) },
  { key: "payableAmount", label: "Payable", align: "right", render: (r) => fmt(r.payableAmount) },
  { key: "remaining", label: "Remaining Balance", align: "right", render: (r) => fmt(r.remaining) },
];

function Card({ label, value, gradient }) {
  return <Box sx={{ background: gradient, color: "#fff", borderRadius: 4, p: 2.4, minHeight: 120, boxShadow: "0 10px 28px rgba(8,33,63,.18)", border: "2px solid rgba(255,255,255,.2)" }}><Typography sx={{ fontSize: 12.5, fontWeight: 800, opacity: .9 }}>{label}</Typography><Typography sx={{ fontSize: 25, fontWeight: 900 }}>{fmt(value)}</Typography></Box>;
}

export default function BalanceSheet() {
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const { ToastUI } = useToast();
  const [data, setData] = useState({ rows: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { const r = await getBalanceSheet(); setData(r.data || { rows: [], totals: {} }); } catch (e) { console.log(e); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => data.rows || [], [data.rows]);
  const totals = data.totals || {};

  return <MainLayout><Box sx={{ px: 3, pt: 1, pb: 4 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", mb: .5 }}>
      <Box><Typography variant="h4" fontWeight="bold">Balance Sheet</Typography><Typography color="text.secondary">Head-wise available balance for {farm}. Every bill reduces the relevant head, while Paid and Payable are shown separately.</Typography></Box>
      <Button variant="outlined" startIcon={<FaSync />} onClick={load}>Refresh</Button>
    </Box>

    <Grid container spacing={2.2} sx={{ mt: 2, mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}><Card label="Total Head Amount" value={totals.totalAmount} gradient="linear-gradient(135deg,#1E88E5 0%,#1565C0 100%)" /></Grid>
      <Grid item xs={12} sm={6} md={3}><Card label="Total Bills" value={totals.billAmount} gradient="linear-gradient(135deg,#A24BD1 0%,#7A1FA2 100%)" /></Grid>
      <Grid item xs={12} sm={6} md={3}><Card label="Paid" value={totals.paidAmount} gradient="linear-gradient(135deg,#2FBF71 0%,#1B8A50 100%)" /></Grid>
      <Grid item xs={12} sm={6} md={3}><Card label="Remaining Balance" value={totals.remaining} gradient="linear-gradient(135deg,#D9B64A 0%,#B8912C 100%)" /></Grid>
    </Grid>

    <SectionCard title={<><FaBalanceScale style={{ marginRight: 8, verticalAlign: -2 }} />Head-wise Balance — {farm}</>} action={rows.length > 0 && <Box sx={{ display: "flex", gap: 1 }}>
      <Button size="small" variant="outlined" startIcon={<FaFileExcel />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,.6)" }} onClick={() => exportExcel(`Balance Sheet - ${farm}`, columns, rows)}>Excel</Button>
      <Button size="small" variant="outlined" startIcon={<FaFilePdf />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,.6)" }} onClick={() => printDocument({ title: `Balance Sheet — ${farm}`, subtitle: "Head-wise remaining balances", landscape: true, bodyHtml: tableHtml(columns, rows) })}>PDF</Button>
      <Button size="small" variant="outlined" startIcon={<FaPrint />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,.6)" }} onClick={() => printDocument({ title: `Balance Sheet — ${farm}`, subtitle: "Head-wise remaining balances", landscape: true, bodyHtml: tableHtml(columns, rows) })}>Print</Button>
    </Box>}>
      {loading ? <Typography sx={{ py: 5, textAlign: "center" }}>Loading balance sheet...</Typography> : rows.length === 0 ? <Box sx={{ py: 6, textAlign: "center", borderRadius: 3, border: `1.5px dashed ${brand.gold}` }}><Typography fontWeight={700}>No finance heads found for {farm}.</Typography></Box> : <Box sx={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}><thead><tr>{["Head","Total Head Amount","Total Bills","Paid","Payable","Remaining Balance"].map((h) => <th key={h} style={{ textAlign: h === "Head" ? "left" : "right", padding: "12px 10px", background: "#f1f6fa", color: "#0F4C81", borderBottom: "1px solid #d9e4ec" }}>{h}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td style={{ padding: 12, borderBottom: "1px solid #edf1f4", fontWeight: 800 }}>{r.headName}</td><td style={{ padding: 12, textAlign: "right", borderBottom: "1px solid #edf1f4" }}>{fmt(r.totalAmount)}</td><td style={{ padding: 12, textAlign: "right", borderBottom: "1px solid #edf1f4" }}>{fmt(r.billAmount)}</td><td style={{ padding: 12, textAlign: "right", borderBottom: "1px solid #edf1f4" }}><Chip size="small" label={fmt(r.paidAmount)} color="success" variant="outlined" /></td><td style={{ padding: 12, textAlign: "right", borderBottom: "1px solid #edf1f4" }}><Chip size="small" label={fmt(r.payableAmount)} color="error" variant="outlined" /></td><td style={{ padding: 12, textAlign: "right", borderBottom: "1px solid #edf1f4", fontWeight: 900, color: r.remaining < 0 ? "#C0392B" : "#1B5E3B" }}>{fmt(r.remaining)}</td></tr>)}</tbody><tfoot><tr><td style={{ padding: 12, fontWeight: 900 }}>TOTAL</td><td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{fmt(totals.totalAmount)}</td><td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{fmt(totals.billAmount)}</td><td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{fmt(totals.paidAmount)}</td><td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{fmt(totals.payableAmount)}</td><td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{fmt(totals.remaining)}</td></tr></tfoot></table>
      </Box>}
    </SectionCard>
  </Box>{ToastUI}</MainLayout>;
}
