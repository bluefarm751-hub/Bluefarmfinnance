import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { FaArrowLeft, FaBalanceScale, FaFileExcel, FaFilePdf, FaSync } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { SectionCard } from "../components/CashBook/ui";
import { getBalanceSheet } from "../api/ledgerApi";
import { exportExcel } from "../utils/exportExcel";
import { printDocument, tableHtml } from "../utils/print";
import { brand } from "../theme";

const fmt = (v) => Number(v || 0).toLocaleString();
const thisYear = new Date().getFullYear();
const years = Array.from({ length: 8 }, (_, i) => thisYear - 5 + i);
const iso = (year, month, day) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export default function BalanceSheetYearlyReport() {
  const navigate = useNavigate();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState({ current: [], previous: [] });
  const [loading, setLoading] = useState(false);

  const period = useMemo(() => ({
    current: { fromDate: iso(year, 1, 1), toDate: iso(year, 12, 31) },
    previous: { fromDate: iso(year - 1, 1, 1), toDate: iso(year - 1, 12, 31) },
  }), [year]);

  const load = async () => {
    setLoading(true);
    try {
      const [current, previous] = await Promise.all([
        getBalanceSheet(period.current),
        getBalanceSheet(period.previous),
      ]);
      setData({ current: current.data?.rows || [], previous: previous.data?.rows || [] });
    } catch (err) {
      console.error(err);
      setData({ current: [], previous: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [year]);

  const rows = useMemo(() => {
    const map = new Map();
    [...data.previous, ...data.current].forEach((r) => {
      const key = r.headName || "Unassigned Head";
      if (!map.has(key)) map.set(key, {
        headName: key,
        previous: { bills: 0, paid: 0, payable: 0 },
        current: { bills: 0, paid: 0, payable: 0 },
      });
    });
    data.previous.forEach((r) => {
      const g = map.get(r.headName || "Unassigned Head");
      g.previous = { bills: Number(r.billAmount || 0), paid: Number(r.paidAmount || 0), payable: Number(r.payableAmount || 0) };
    });
    data.current.forEach((r) => {
      const g = map.get(r.headName || "Unassigned Head");
      g.current = { bills: Number(r.billAmount || 0), paid: Number(r.paidAmount || 0), payable: Number(r.payableAmount || 0) };
    });
    return Array.from(map.values()).sort((a, b) => a.headName.localeCompare(b.headName));
  }, [data]);

  const columns = [
    { key: "headName", label: "Head" },
    { key: "previousBills", label: `${year - 1} Bills`, align: "right", render: (r) => fmt(r.previous.bills) },
    { key: "currentBills", label: `${year} Bills`, align: "right", render: (r) => fmt(r.current.bills) },
    { key: "billChange", label: "Bills Change", align: "right", render: (r) => fmt(r.current.bills - r.previous.bills) },
    { key: "previousPaid", label: `${year - 1} Paid`, align: "right", render: (r) => fmt(r.previous.paid) },
    { key: "currentPaid", label: `${year} Paid`, align: "right", render: (r) => fmt(r.current.paid) },
    { key: "paidChange", label: "Paid Change", align: "right", render: (r) => fmt(r.current.paid - r.previous.paid) },
    { key: "previousPayable", label: `${year - 1} Payable`, align: "right", render: (r) => fmt(r.previous.payable) },
    { key: "currentPayable", label: `${year} Payable`, align: "right", render: (r) => fmt(r.current.payable) },
    { key: "payableChange", label: "Payable Change", align: "right", render: (r) => fmt(r.current.payable - r.previous.payable) },
  ];

  const title = `Yearly Balance Sheet Comparison — ${year} vs ${year - 1}`;
  const exportReport = (pdf) => {
    if (!rows.length) return;
    if (pdf) {
      printDocument({
        title: `${title} — ${farm}`,
        subtitle: "Head-wise annual comparison of bill, paid and payable amounts.",
        landscape: true,
        bodyHtml: tableHtml(columns, rows),
      });
    } else {
      exportExcel(`Yearly_Balance_Sheet_Comparison_${farm}_${year}_vs_${year - 1}`, columns, rows);
    }
  };

  return <MainLayout><Box sx={{ px: 3, pt: 1, pb: 4 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 2 }}>
      <Box>
        <Chip icon={<FaBalanceScale />} label="BALANCE SHEET REPORT" sx={{ mb: 1, background: `${brand.gold}22`, border: `1px solid ${brand.gold}`, fontWeight: 800 }} />
        <Typography variant="h4" fontWeight="bold">{title}</Typography>
        <Typography color="text.secondary" mt={0.5}>Compare full-year head-wise bills, paid amounts and payable amounts.</Typography>
      </Box>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button variant="outlined" startIcon={<FaArrowLeft />} onClick={() => navigate("/ledger/balance-sheet-report")}>Balance Sheet Report</Button>
        <Button variant="outlined" startIcon={<FaSync />} onClick={load}>Refresh</Button>
      </Box>
    </Box>
    <SectionCard title={<><FaBalanceScale style={{ marginRight: 8, verticalAlign: -2 }} />{title} — {farm}</>} action={<Box sx={{ display: "flex", gap: 1 }}><Button size="small" variant="contained" startIcon={<FaFileExcel />} disabled={loading || !rows.length} onClick={() => exportReport(false)}>Excel</Button><Button size="small" variant="contained" color="error" startIcon={<FaFilePdf />} disabled={loading || !rows.length} onClick={() => exportReport(true)}>PDF</Button></Box>}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}><TextField fullWidth size="small" select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={8}><Box sx={{ display: "flex", alignItems: "center", height: "100%" }}><Chip label={`${year} compared with ${year - 1}`} sx={{ fontWeight: 800 }} /></Box></Grid>
      </Grid>
      {loading ? <Typography sx={{ py: 6, textAlign: "center" }}>Loading report...</Typography> : !rows.length ? <Typography sx={{ py: 6, textAlign: "center" }}>No yearly Balance Sheet data found.</Typography> : <Box sx={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1300 }}><thead><tr>{columns.map((c) => <th key={c.key} style={{ textAlign: c.align || "left", padding: "10px", background: "#f1f6fa", color: "#0F4C81", borderBottom: "1px solid #d9e4ec", fontSize: 12 }}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.headName}>{columns.map((c) => <td key={c.key} style={{ textAlign: c.align || "left", padding: "10px", borderBottom: "1px solid #edf1f4", fontWeight: 600 }}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>)}</tbody></table></Box>}
    </SectionCard>
  </Box></MainLayout>;
}
