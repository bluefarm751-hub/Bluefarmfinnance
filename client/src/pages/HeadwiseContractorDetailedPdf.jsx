import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { FaArrowLeft, FaFilePdf, FaSync } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { SectionCard } from "../components/CashBook/ui";
import { getPartyLedgerSummary, getParties } from "../api/ledgerApi";
import { printDocument } from "../utils/print";
import { brand } from "../theme";

const fmt = (v) => Number(v || 0).toLocaleString();
const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i, 1).toLocaleString("en", { month: "long" }) }));
const thisYear = new Date().getFullYear();
const years = Array.from({ length: 8 }, (_, i) => thisYear - 5 + i);

export default function HeadwiseContractorDetailedPdf() {
  const navigate = useNavigate();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const [parties, setParties] = useState([]);
  const [party, setParty] = useState("__ALL__");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState({ summary: [], totals: { business: 0, paid: 0, payable: 0 } });
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => {
    const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const toDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { fromDate, toDate };
  }, [month, year]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getPartyLedgerSummary(party === "__ALL__" ? "" : party, range);
      setData(r.data || { summary: [], totals: { business: 0, paid: 0, payable: 0 } });
    } catch (err) {
      console.error(err);
      setData({ summary: [], totals: { business: 0, paid: 0, payable: 0 } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { getParties().then((r) => setParties(r.data || [])).catch(() => {}); }, []);
  useEffect(() => { load(); }, [party, month, year]);

  const ordered = useMemo(() => [...data.summary].sort((a, b) => `${a.headName}-${a.partyName}`.localeCompare(`${b.headName}-${b.partyName}`)), [data.summary]);

  const buildPdf = () => {
    if (!ordered.length) return;
    const grouped = new Map();
    ordered.forEach((g) => {
      const head = g.headName || "Unassigned Head";
      if (!grouped.has(head)) grouped.set(head, []);
      grouped.get(head).push(g);
    });
    let html = `
      <style>
        .summary{width:100%;border-collapse:collapse;margin:0 0 14px}
        .summary th,.summary td{border:1px solid #d9e4ec;padding:7px 8px;font-size:11px}
        .summary th{background:#f1f6fa;color:#0F4C81}
        .bill{width:100%;border-collapse:collapse;margin:6px 0 18px}
        .bill th,.bill td{border:1px solid #e1e5e9;padding:6px 7px;font-size:10px}
        .bill th{background:#f7f9fb}
        .head{margin-top:18px;color:#0F4C81;font-size:16px;font-weight:800;border-bottom:2px solid #D4AF37;padding-bottom:4px}
        .party{margin-top:10px;font-size:13px;font-weight:800}
      </style>`;
    grouped.forEach((groups, headName) => {
      const headBusiness = groups.reduce((s, g) => s + Number(g.totalBill || 0), 0);
      const headPaid = groups.reduce((s, g) => s + Number(g.paid || 0), 0);
      const headPayable = groups.reduce((s, g) => s + Number(g.payable || 0), 0);
      html += `<div class="head">Head: ${headName}</div>`;
      html += `<table class="summary"><thead><tr><th>Contractor</th><th>Business</th><th>Paid</th><th>Payable</th><th>Party Remaining</th></tr></thead><tbody>`;
      groups.forEach((g) => {
        html += `<tr><td>${g.partyName || "Unassigned Party"}</td><td style="text-align:right">${fmt(g.totalBill)}</td><td style="text-align:right">${fmt(g.paid)}</td><td style="text-align:right">${fmt(g.payable)}</td><td style="text-align:right">${fmt(g.remaining)}</td></tr>`;
      });
      html += `<tr><th>Head Total</th><th style="text-align:right">${fmt(headBusiness)}</th><th style="text-align:right">${fmt(headPaid)}</th><th style="text-align:right">${fmt(headPayable)}</th><th></th></tr></tbody></table>`;
      groups.forEach((g) => {
        html += `<div class="party">Contractor: ${g.partyName || "Unassigned Party"}</div>`;
        html += `<table class="bill"><thead><tr><th>Date</th><th>Bill No.</th><th>Description</th><th>Status</th><th>Amount</th><th>Paid</th><th>Payable</th><th>Remaining</th></tr></thead><tbody>`;
        (g.bills || []).forEach((b) => {
          html += `<tr><td>${b.billDate || ""}</td><td>${b.sNo ? `BILL-${b.sNo}` : `BILL-${b.id}`}</td><td>${b.item || b.remarks || ""}</td><td>${b.status || "Payable"}</td><td style="text-align:right">${fmt(b.amount)}</td><td style="text-align:right">${fmt(b.paid)}</td><td style="text-align:right">${fmt(b.payable)}</td><td style="text-align:right">${fmt(b.remaining)}</td></tr>`;
        });
        html += `<tr><th colspan="4">Contractor Total</th><th style="text-align:right">${fmt(g.totalBill)}</th><th style="text-align:right">${fmt(g.paid)}</th><th style="text-align:right">${fmt(g.payable)}</th><th style="text-align:right">${fmt(g.remaining)}</th></tr></tbody></table>`;
      });
    });
    printDocument({
      title: `Head-wise Contractor Detailed Report — ${months[month - 1].label} ${year}`,
      subtitle: `${farm} · ${party === "__ALL__" ? "All Contractors" : party} · Total Business ${fmt(data.totals.business)} · Paid ${fmt(data.totals.paid)} · Payable ${fmt(data.totals.payable)}`,
      landscape: true,
      bodyHtml: html,
    });
  };

  return <MainLayout><Box sx={{ px: 3, pt: 1, pb: 4 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 2 }}>
      <Box><Chip icon={<FaFilePdf />} label="PARTY LEDGER REPORT" sx={{ mb: 1, background: `${brand.gold}22`, border: `1px solid ${brand.gold}`, fontWeight: 800 }} /><Typography variant="h4" fontWeight="bold">Head-wise Contractor Detailed PDF</Typography><Typography color="text.secondary" mt={0.5}>Summary by head plus every individual contractor bill.</Typography></Box>
      <Box sx={{ display: "flex", gap: 1 }}><Button variant="outlined" startIcon={<FaArrowLeft />} onClick={() => navigate("/ledger")}>Ledger</Button><Button variant="outlined" startIcon={<FaSync />} onClick={load}>Refresh</Button></Box>
    </Box>
    <SectionCard title={<><FaFilePdf style={{ marginRight: 8, verticalAlign: -2 }} />Detailed Contractor Bill Report — {farm}</>} action={<Button variant="contained" color="error" startIcon={<FaFilePdf / className="bf-export-button bf-export-pdf">} disabled={loading || !ordered.length} onClick={buildPdf}>Generate PDF</Button>}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}><TextField fullWidth size="small" select label="Party / Contractor" value={party} onChange={(e) => setParty(e.target.value)}><MenuItem value="__ALL__">All Contractors — Consolidated</MenuItem>{parties.map((p) => <MenuItem key={p.name} value={p.name}>{p.name}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} sm={6} md={2.5}><TextField fullWidth size="small" select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{months.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} sm={6} md={2.5}><TextField fullWidth size="small" select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={2}><Box sx={{ p: 1.5, borderRadius: 2, background: "#f5f8fa", border: "1px solid #e1e8ee", fontSize: 12 }}><b>Business:</b> {fmt(data.totals.business)}<br/><b>Paid:</b> {fmt(data.totals.paid)}<br/><b>Payable:</b> {fmt(data.totals.payable)}</Box></Grid>
      </Grid>
      {loading ? <Typography sx={{ py: 5, textAlign: "center" }}>Loading report...</Typography> : !ordered.length ? <Typography sx={{ py: 5, textAlign: "center" }}>No contractor bills found for this period.</Typography> : <Box sx={{ overflowX: "auto" }}><Typography fontWeight={800} sx={{ mb: 1 }}>The PDF will include every bill under each head, with Paid / Payable and running Party Remaining.</Typography>{ordered.map((g, i) => <Box key={`${g.headName}-${g.partyName}-${i}`} sx={{ mb: 2, p: 1.5, border: "1px solid #e1e8ee", borderRadius: 2 }}><Typography fontWeight={800} color="#0F4C81">{g.headName} — {g.partyName}</Typography><Typography variant="body2" color="text.secondary">Business {fmt(g.totalBill)} · Paid {fmt(g.paid)} · Payable {fmt(g.payable)} · Remaining {fmt(g.remaining)} · Bills {(g.bills || []).length}</Typography></Box>)}</Box>}
    </SectionCard>
  </Box></MainLayout>;
}
