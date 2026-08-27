import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { FaArrowLeft, FaBalanceScale, FaFilePdf, FaSync } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { SectionCard } from "../components/CashBook/ui";
import { getBalanceSheet } from "../api/ledgerApi";
import { printDocument } from "../utils/print";
import { brand } from "../theme";

const fmt = (v) => Number(v || 0).toLocaleString();
const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i, 1).toLocaleString("en", { month: "long" }) }));
const thisYear = new Date().getFullYear();
const years = Array.from({ length: 8 }, (_, i) => thisYear - 5 + i);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const esc = (v) => String(v ?? "").replace(/[&<>\"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[m]));

export default function BalanceSheetFullDetailPdf() {
  const navigate = useNavigate();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const now = new Date();
  const [mode, setMode] = useState("month");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState({ rows: [], totals: {} });
  const [loading, setLoading] = useState(false);

  const dates = useMemo(() => {
    if (mode === "month") {
      const first = new Date(year, month - 1, 1);
      const last = new Date(year, month, 0);
      return { fromDate: iso(first), toDate: iso(last) };
    }
    if (mode === "custom") return { fromDate, toDate };
    return {};
  }, [mode, month, year, fromDate, toDate]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getBalanceSheet(dates);
      setData(r.data || { rows: [], totals: {} });
    } catch (err) {
      console.error(err);
      setData({ rows: [], totals: {} });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [mode, month, year, fromDate, toDate]);

  const label = useMemo(() => {
    if (mode === "month") return `${months[month - 1].label} ${year}`;
    if (mode === "custom") return `${fromDate || "Start"} to ${toDate || "End"}`;
    return "All Dates";
  }, [mode, month, year, fromDate, toDate]);

  const buildPdf = () => {
    if (!data.rows?.length) return;
    let html = `<style>
      .summary,.detail{width:100%;border-collapse:collapse;margin:0 0 18px}
      .summary th,.summary td,.detail th,.detail td{border:1px solid #d9e4ec;padding:7px 8px;font-size:10px}
      .summary th{background:#f1f6fa;color:#0F4C81}.detail th{background:#f7f9fb;color:#0F4C81}
      .head{margin:18px 0 7px;color:#0F4C81;font-size:15px;font-weight:800;border-bottom:2px solid #D4AF37;padding-bottom:4px}
      .totals{font-weight:800;background:#eef5f9}
    </style>`;
    html += `<table class="summary"><thead><tr><th>Head</th><th>Total Head Amount</th><th>Total Bills</th><th>Paid</th><th>Payable</th><th>Remaining</th></tr></thead><tbody>`;
    data.rows.forEach((r) => { html += `<tr><td>${esc(r.headName)}</td><td style="text-align:right">${fmt(r.totalAmount)}</td><td style="text-align:right">${fmt(r.billAmount)}</td><td style="text-align:right">${fmt(r.paidAmount)}</td><td style="text-align:right">${fmt(r.payableAmount)}</td><td style="text-align:right">${fmt(r.remaining)}</td></tr>`; });
    html += `<tr class="totals"><td>Grand Total</td><td style="text-align:right">${fmt(data.totals.totalAmount)}</td><td style="text-align:right">${fmt(data.totals.billAmount)}</td><td style="text-align:right">${fmt(data.totals.paidAmount)}</td><td style="text-align:right">${fmt(data.totals.payableAmount)}</td><td style="text-align:right">${fmt(data.totals.remaining)}</td></tr></tbody></table>`;
    data.rows.forEach((r) => {
      html += `<div class="head">Head: ${esc(r.headName)}</div>`;
      html += `<table class="detail"><thead><tr><th>Date</th><th>Bill No.</th><th>Contractor</th><th>Description</th><th>Status</th><th>Amount</th></tr></thead><tbody>`;
      (r.bills || []).forEach((b) => { html += `<tr><td>${esc(b.billDate ? new Date(b.billDate).toLocaleDateString() : "")}</td><td>${esc(b.billNo)}</td><td>${esc(b.contractorName)}</td><td>${esc(b.item || b.remarks || "")}</td><td>${esc(b.status)}</td><td style="text-align:right">${fmt(b.amount)}</td></tr>`; });
      html += `<tr class="totals"><td colspan="5">Head Bills Total</td><td style="text-align:right">${fmt(r.billAmount)}</td></tr></tbody></table>`;
    });
    printDocument({ title: `Balance Sheet — Full Bill Detail — ${label}`, subtitle: `${farm} · Head-wise summary and every bill included in the selected period.`, landscape: true, bodyHtml: html });
  };

  return <MainLayout><Box sx={{ px: 3, pt: 1, pb: 4 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 2 }}>
      <Box><Chip icon={<FaBalanceScale />} label="BALANCE SHEET REPORT" sx={{ mb: 1, background: `${brand.gold}22`, border: `1px solid ${brand.gold}`, fontWeight: 800 }} /><Typography variant="h4" fontWeight="bold">Balance Sheet Full Detail PDF</Typography><Typography color="text.secondary" mt={0.5}>Full head-wise bill breakup for the selected period.</Typography></Box>
      <Box sx={{ display: "flex", gap: 1 }}><Button variant="outlined" startIcon={<FaArrowLeft />} onClick={() => navigate("/ledger/balance-sheet-report")}>Balance Sheet Report</Button><Button variant="outlined" startIcon={<FaSync />} onClick={load}>Refresh</Button></Box>
    </Box>
    <SectionCard title={<><FaFilePdf style={{ marginRight: 8, verticalAlign: -2 }} />Full Bill Detail — {farm}</>} action={<Button variant="contained" color="error" startIcon={<FaFilePdf />} disabled={loading || !data.rows?.length} onClick={buildPdf}>Generate Full PDF</Button>}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}><TextField fullWidth size="small" select label="Filter" value={mode} onChange={(e) => setMode(e.target.value)}><MenuItem value="month">Month / Year</MenuItem><MenuItem value="custom">Custom Date</MenuItem><MenuItem value="all">All Dates</MenuItem></TextField></Grid>
        {mode === "month" && <><Grid item xs={12} sm={6} md={2.5}><TextField fullWidth size="small" select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{months.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}</TextField></Grid><Grid item xs={12} sm={6} md={2.5}><TextField fullWidth size="small" select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField></Grid></>}
        {mode === "custom" && <><Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" type="date" label="From Date" InputLabelProps={{ shrink: true }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Grid><Grid item xs={12} sm={6} md={3}><TextField fullWidth size="small" type="date" label="To Date" InputLabelProps={{ shrink: true }} value={toDate} onChange={(e) => setToDate(e.target.value)} /></Grid></>}
        <Grid item xs={12} md={mode === "all" ? 9 : 3}><Box sx={{ p: 1.5, borderRadius: 2, background: "#f5f8fa", border: "1px solid #e1e8ee", fontSize: 12 }}><b>Period:</b> {label}<br/><b>Bills:</b> {fmt(data.totals.billAmount)}<br/><b>Paid:</b> {fmt(data.totals.paidAmount)}<br/><b>Payable:</b> {fmt(data.totals.payableAmount)}</Box></Grid>
      </Grid>
      {loading ? <Typography sx={{ py: 5, textAlign: "center" }}>Loading report...</Typography> : !data.rows?.length ? <Typography sx={{ py: 5, textAlign: "center" }}>No Balance Sheet data found for this period.</Typography> : <Box sx={{ overflowX: "auto" }}><Typography fontWeight={800} sx={{ mb: 1 }}>The PDF includes the summary plus every individual bill under each head.</Typography><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}><thead><tr>{["Head","Total Head Amount","Total Bills","Paid","Payable","Remaining"].map((h) => <th key={h} style={{ textAlign: h === "Head" ? "left" : "right", padding: 10, background: "#f1f6fa", color: "#0F4C81", borderBottom: "1px solid #d9e4ec" }}>{h}</th>)}</tr></thead><tbody>{data.rows.map((r) => <tr key={r.id}>{[r.headName, fmt(r.totalAmount), fmt(r.billAmount), fmt(r.paidAmount), fmt(r.payableAmount), fmt(r.remaining)].map((v, i) => <td key={i} style={{ textAlign: i === 0 ? "left" : "right", padding: 10, borderBottom: "1px solid #edf1f4", fontWeight: 600 }}>{v}</td>)}</tr>)}</tbody></table></Box>}
    </SectionCard>
  </Box></MainLayout>;
}
