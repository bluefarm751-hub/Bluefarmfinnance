import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { FaArrowLeft, FaBalanceScale, FaFileExcel, FaFilePdf, FaSync } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { SectionCard } from "../components/CashBook/ui";
import { getPartyLedgerSummary } from "../api/ledgerApi";
import { exportExcel } from "../utils/exportExcel";
import { printDocument, tableHtml } from "../utils/print";
import { brand } from "../theme";

const fmt = (v) => Number(v || 0).toLocaleString();
const thisYear = new Date().getFullYear();
const years = Array.from({ length: 8 }, (_, i) => thisYear - 5 + i);
const iso = (year, month, day) => `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const columns = [
  { key: "partyName", label: "Contractor" },
  { key: "previousBills", label: "Previous Year Business", align: "right", render: (r) => fmt(r.previous.business) },
  { key: "currentBills", label: "Current Year Business", align: "right", render: (r) => fmt(r.current.business) },
  { key: "businessChange", label: "Business Change", align: "right", render: (r) => fmt(r.current.business - r.previous.business) },
  { key: "previousPaid", label: "Previous Paid", align: "right", render: (r) => fmt(r.previous.paid) },
  { key: "currentPaid", label: "Current Paid", align: "right", render: (r) => fmt(r.current.paid) },
  { key: "paidChange", label: "Paid Change", align: "right", render: (r) => fmt(r.current.paid - r.previous.paid) },
  { key: "previousPayable", label: "Previous Payable", align: "right", render: (r) => fmt(r.previous.payable) },
  { key: "currentPayable", label: "Current Payable", align: "right", render: (r) => fmt(r.current.payable) },
  { key: "payableChange", label: "Payable Change", align: "right", render: (r) => fmt(r.current.payable - r.previous.payable) },
];

export default function YearlyContractorComparisonReport() {
  const navigate = useNavigate();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState({ previous: { summary: [] }, current: { summary: [] } });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        current: { fromDate: iso(year, 1, 1), toDate: iso(year, 12, 31) },
        previous: { fromDate: iso(year - 1, 1, 1), toDate: iso(year - 1, 12, 31) },
      };
      const [current, previous] = await Promise.all([
        getPartyLedgerSummary("", params.current),
        getPartyLedgerSummary("", params.previous),
      ]);
      setData({ current: current.data || { summary: [] }, previous: previous.data || { summary: [] } });
    } catch (err) {
      console.error(err);
      setData({ previous: { summary: [] }, current: { summary: [] } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [year]);

  const rows = useMemo(() => {
    const map = new Map();
    const add = (items, side) => (items || []).forEach((g) => {
      const key = String(g.partyName || "Unassigned Party").trim() || "Unassigned Party";
      if (!map.has(key)) map.set(key, { partyName: key, previous: { business: 0, paid: 0, payable: 0 }, current: { business: 0, paid: 0, payable: 0 } });
      const r = map.get(key);
      r[side].business += Number(g.totalBill || 0);
      r[side].paid += Number(g.paid || 0);
      r[side].payable += Number(g.payable || 0);
    });
    add(data.previous.summary, "previous");
    add(data.current.summary, "current");
    return Array.from(map.values()).sort((a, b) => a.partyName.localeCompare(b.partyName));
  }, [data]);

  const title = `Yearly Contractor Comparison — ${year} vs ${year - 1}`;
  const exportReport = (pdf) => {
    if (!rows.length) return;
    if (pdf) printDocument({ title: `${title} — ${farm}`, subtitle: "Contractor-wise annual business, paid and payable comparison.", landscape: true, bodyHtml: tableHtml(columns, rows) });
    else exportExcel(`Yearly_Contractor_Comparison_${farm}_${year}_vs_${year - 1}`, columns, rows);
  };

  return <MainLayout><Box sx={{ px: 3, pt: 1, pb: 4 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 2 }}>
      <Box><Chip icon={<FaBalanceScale />} label="BALANCE SHEET / CONTRACTOR REPORT" sx={{ mb: 1, background: `${brand.gold}22`, border: `1px solid ${brand.gold}`, fontWeight: 800 }} /><Typography variant="h4" fontWeight="bold">{title}</Typography><Typography color="text.secondary" mt={0.5}>Compare each contractor's yearly business, paid and payable amounts.</Typography></Box>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}><Button variant="outlined" startIcon={<FaArrowLeft />} onClick={() => navigate("/ledger")}>Ledger</Button><Button variant="outlined" startIcon={<FaSync />} onClick={load}>Refresh</Button></Box>
    </Box>
    <SectionCard title={<><FaBalanceScale style={{ marginRight: 8, verticalAlign: -2 }} />{title} — {farm}</>} action={<Box sx={{ display: "flex", gap: 1 }}><Button size="small" variant="contained" startIcon={<FaFileExcel / className="bf-export-button bf-export-excel">} disabled={loading || !rows.length} onClick={() => exportReport(false)}>Excel</Button><Button size="small" variant="contained" color="error" startIcon={<FaFilePdf / className="bf-export-button bf-export-pdf">} disabled={loading || !rows.length} onClick={() => exportReport(true)}>PDF</Button></Box>}>
      <Grid container spacing={2} sx={{ mb: 3 }}><Grid item xs={12} md={4}><TextField fullWidth size="small" select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField></Grid><Grid item xs={12} md={8}><Box sx={{ display: "flex", alignItems: "center", height: "100%" }}><Chip label={`${year} compared with ${year - 1}`} sx={{ fontWeight: 800 }} /></Box></Grid></Grid>
      {loading ? <Typography sx={{ py: 6, textAlign: "center" }}>Loading report...</Typography> : !rows.length ? <Typography sx={{ py: 6, textAlign: "center" }}>No contractor data found.</Typography> : <Box sx={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1400 }}><thead><tr>{columns.map((c) => <th key={c.key} style={{ textAlign: c.align || "left", padding: "10px", background: "#f1f6fa", color: "#0F4C81", borderBottom: "1px solid #d9e4ec", fontSize: 12 }}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.partyName}>{columns.map((c) => <td key={c.key} style={{ textAlign: c.align || "left", padding: "10px", borderBottom: "1px solid #edf1f4", fontWeight: 600 }}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>)}</tbody></table></Box>}
    </SectionCard>
  </Box></MainLayout>;
}
