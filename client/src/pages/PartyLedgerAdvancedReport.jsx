import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Chip, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { FaArrowLeft, FaBalanceScale, FaFileExcel, FaFilePdf } from "react-icons/fa";
import MainLayout from "../layouts/MainLayout";
import { SectionCard } from "../components/CashBook/ui";
import { getPartyLedgerSummary, getParties } from "../api/ledgerApi";
import { brand } from "../theme";
import { exportExcel } from "../utils/exportExcel";
import { printDocument, tableHtml } from "../utils/print";

const num = (v) => Number(v || 0);
const fmt = (v) => `Rs. ${num(v).toLocaleString()}`;
const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i, 1).toLocaleString("en", { month: "long" }) }));
const thisYear = new Date().getFullYear();
const years = Array.from({ length: 8 }, (_, i) => thisYear - 5 + i);

export default function PartyLedgerAdvancedReport({ mode = "excel", type = "head-summary" }) {
  const navigate = useNavigate();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const isExcel = mode === "excel";
  const isMonthly = type === "monthly";
  const [parties, setParties] = useState([]);
  const [party, setParty] = useState("__ALL__");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState({ summary: [], totals: { business: 0, paid: 0, payable: 0 } });
  const [loading, setLoading] = useState(false);

  useEffect(() => { getParties().then((r) => setParties(r.data || [])).catch(() => {}); }, []);

  useEffect(() => {
    if (!party) { setData({ summary: [], totals: { business: 0, paid: 0, payable: 0 } }); return; }
    setLoading(true);
    const fromDate = isMonthly ? `${year}-${String(month).padStart(2, "0")}-01` : "";
    const lastDay = isMonthly ? new Date(year, month, 0).getDate() : null;
    const toDate = isMonthly ? `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}` : "";
    getPartyLedgerSummary(party === "__ALL__" ? "" : party, { fromDate, toDate })
      .then((r) => setData(r.data || { summary: [], totals: { business: 0, paid: 0, payable: 0 } }))
      .catch(() => setData({ summary: [], totals: { business: 0, paid: 0, payable: 0 } }))
      .finally(() => setLoading(false));
  }, [party, month, year, isMonthly]);

  const rows = useMemo(() => data.summary.map((g) => ({
    partyName: g.partyName,
    headName: g.headName,
    headTotal: g.headTotal,
    business: g.totalBill,
    paid: g.paid,
    payable: g.payable,
    remaining: g.remaining,
    bills: g.bills.length,
  })), [data.summary]);

  const columns = useMemo(() => isMonthly ? [
    ...(party === "__ALL__" ? [{ key: "partyName", label: "Party" }] : []),
    { key: "headName", label: "Head" },
    { key: "business", label: "Monthly Business", align: "right", render: (r) => fmt(r.business) },
    { key: "paid", label: "Paid", align: "right", render: (r) => fmt(r.paid) },
    { key: "payable", label: "Payable", align: "right", render: (r) => fmt(r.payable) },
    { key: "remaining", label: "Paid Balance Remaining", align: "right", render: (r) => fmt(r.remaining) },
    { key: "bills", label: "Bills", align: "right" },
  ] : [
    ...(party === "__ALL__" ? [{ key: "partyName", label: "Party" }] : []),
    { key: "headName", label: "Head" },
    { key: "headTotal", label: "Total Paid", align: "right", render: (r) => fmt(r.headTotal) },
    { key: "business", label: "Total Business", align: "right", render: (r) => fmt(r.business) },
    { key: "paid", label: "Paid", align: "right", render: (r) => fmt(r.paid) },
    { key: "payable", label: "Payable", align: "right", render: (r) => fmt(r.payable) },
    { key: "remaining", label: "Paid Balance Remaining", align: "right", render: (r) => fmt(r.remaining) },
    { key: "bills", label: "Bills", align: "right" },
  ], [isMonthly, party]);

  const titleKind = isMonthly ? `Monthly Party Ledger — ${months[month - 1].label} ${year}` : "Contractor-wise Head Summary";
  const exportIt = () => {
    if (!rows.length) return;
    const partyLabel = party === "__ALL__" ? "All Contractors" : party;
    const filename = `${isMonthly ? "Monthly_Party_Ledger" : "Party_Ledger_Head_Summary"}_${partyLabel.replace(/\s+/g, "_")}_${isMonthly ? `${year}_${String(month).padStart(2, "0")}` : ""}`;
    if (isExcel) exportExcel(filename, columns, rows);
    else printDocument({ title: `${titleKind} — ${partyLabel}`, subtitle: `${farm} · Total Business ${fmt(data.totals.business)} · Paid ${fmt(data.totals.paid)} · Payable ${fmt(data.totals.payable)}`, landscape: true, bodyHtml: tableHtml(columns, rows) });
  };

  return <MainLayout><Box sx={{ px: 3, pt: 1, pb: 4 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 1 }}>
      <Box><Chip icon={<FaBalanceScale />} label="PARTY LEDGER REPORT" sx={{ mb: 1, background: `${brand.gold}22`, border: `1px solid ${brand.gold}`, color: brand.goldDark, fontWeight: 800 }} />
        <Typography variant="h4" fontWeight="bold">{titleKind} — {isExcel ? "Excel" : "PDF"}</Typography>
        <Typography color="text.secondary" mt={0.5}>{isMonthly ? "Monthly Party Ledger summary by contractor and head." : "Contractor-wise summary pulled from added bills, showing business, paid, payable and paid-balance remaining by head."}</Typography>
      </Box>
      <Button variant="outlined" startIcon={<FaArrowLeft />} onClick={() => navigate("/ledger/party")}>Back to Party Ledger</Button>
    </Box>
    <SectionCard title={<><FaBalanceScale style={{ marginRight: 8, verticalAlign: -2 }} />{titleKind} — {farm}</>}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={isMonthly ? 5 : 7}><TextField fullWidth size="small" select label="Party / Contractor" value={party} onChange={(e) => setParty(e.target.value)}><MenuItem value="__ALL__">All Contractors — Consolidated</MenuItem>{parties.map((p) => <MenuItem key={p.name} value={p.name}>{p.name}</MenuItem>)}</TextField></Grid>
        {isMonthly && <><Grid item xs={12} sm={6} md={2}><TextField fullWidth size="small" select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{months.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}</TextField></Grid><Grid item xs={12} sm={6} md={2}><TextField fullWidth size="small" select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField></Grid></>}
        <Grid item xs={12} md={isMonthly ? 3 : 5}><Box sx={{ display: "flex", justifyContent: { xs: "flex-start", md: "flex-end" }, alignItems: "center", height: "100%" }}><Button variant="contained" disabled={!rows.length || loading} startIcon={isExcel ? <FaFileExcel / className="bf-export-button bf-export-excel"> : <FaFilePdf />} onClick={exportIt}>{isExcel ? "Download Excel" : "Generate PDF"}</Button></Box></Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}><Box sx={{ p: 2, borderRadius: 3, background: "linear-gradient(135deg,#1E88E5 0%,#1565C0 100%)", color: "#fff" }}><Typography variant="caption">TOTAL BUSINESS</Typography><Typography variant="h6" fontWeight={900}>{fmt(data.totals.business)}</Typography></Box></Grid>
        <Grid item xs={12} sm={4}><Box sx={{ p: 2, borderRadius: 3, background: "linear-gradient(135deg,#2FBF71 0%,#1B8A50 100%)", color: "#fff" }}><Typography variant="caption">PAID AMOUNT</Typography><Typography variant="h6" fontWeight={900}>{fmt(data.totals.paid)}</Typography></Box></Grid>
        <Grid item xs={12} sm={4}><Box sx={{ p: 2, borderRadius: 3, background: "linear-gradient(135deg,#F0574D 0%,#C0392B 100%)", color: "#fff" }}><Typography variant="caption">PAYABLE AMOUNT</Typography><Typography variant="h6" fontWeight={900}>{fmt(data.totals.payable)}</Typography></Box></Grid>
      </Grid>
      {loading ? <Typography sx={{ py: 5, textAlign: "center" }}>Loading report...</Typography> : !rows.length ? <Typography sx={{ py: 5, textAlign: "center" }}>No Party Ledger data found.</Typography> : <Box sx={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 950 }}><thead><tr>{columns.map((c) => <th key={c.key} style={{ textAlign: c.align || "left", padding: "11px 10px", background: "#f1f6fa", color: "#0F4C81", borderBottom: "1px solid #d9e4ec", fontSize: 12.5 }}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={`${r.partyName}-${r.headName}-${i}`}>{columns.map((c) => <td key={c.key} style={{ textAlign: c.align || "left", padding: "10px", borderBottom: "1px solid #edf1f4", fontWeight: ["business","paid","payable","remaining","headTotal"].includes(c.key) ? 700 : 400 }}>{c.render ? c.render(r) : (r[c.key] ?? "—")}</td>)}</tr>)}</tbody></table></Box>}
    </SectionCard>
  </Box></MainLayout>;
}
