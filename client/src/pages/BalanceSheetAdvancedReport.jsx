import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { FaArrowLeft, FaBalanceScale, FaFileExcel, FaFilePdf, FaSync } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { SectionCard } from "../components/CashBook/ui";
import { getBalanceSheet, getPartyLedgerSummary } from "../api/ledgerApi";
import { exportExcel } from "../utils/exportExcel";
import { printDocument, tableHtml } from "../utils/print";
import { brand } from "../theme";

const fmt = (v) => Number(v || 0).toLocaleString();
const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i, 1).toLocaleString("en", { month: "long" }) }));
const thisYear = new Date().getFullYear();
const years = Array.from({ length: 8 }, (_, i) => thisYear - 5 + i);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function BalanceSheetAdvancedReport({ type = "monthly-comparison" }) {
  const navigate = useNavigate();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState({ current: [], previous: [] });
  const [contractorRows, setContractorRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const isComparison = type === "monthly-comparison";

  const period = useMemo(() => {
    const currentFirst = new Date(year, month - 1, 1);
    const currentLast = new Date(year, month, 0);
    const previousFirst = new Date(year, month - 2, 1);
    const previousLast = new Date(year, month - 1, 0);
    return {
      current: { fromDate: iso(currentFirst), toDate: iso(currentLast) },
      previous: { fromDate: iso(previousFirst), toDate: iso(previousLast) },
    };
  }, [month, year]);

  const load = async () => {
    setLoading(true);
    try {
      if (isComparison) {
        const [current, previous] = await Promise.all([
          getBalanceSheet(period.current),
          getBalanceSheet(period.previous),
        ]);
        setData({ current: current.data?.rows || [], previous: previous.data?.rows || [] });
      } else {
        const r = await getPartyLedgerSummary("", period.current);
        setContractorRows(r.data?.summary || []);
      }
    } catch (e) {
      console.error(e);
      setData({ current: [], previous: [] });
      setContractorRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month, year, type]);

  const comparisonRows = useMemo(() => {
    const map = new Map();
    [...data.previous, ...data.current].forEach((r) => {
      const key = r.headName || "Unassigned Head";
      if (!map.has(key)) map.set(key, { headName: key, previous: { bills: 0, paid: 0, payable: 0 }, current: { bills: 0, paid: 0, payable: 0 } });
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

  const contractorSummary = useMemo(() => {
    const groups = new Map();
    contractorRows.forEach((r) => {
      const key = `${r.headName}::${r.partyName}`;
      if (!groups.has(key)) groups.set(key, { headName: r.headName, partyName: r.partyName, business: 0, paid: 0, payable: 0, remaining: Number(r.remaining || 0), bills: 0 });
      const g = groups.get(key);
      g.business += Number(r.totalBill || 0);
      g.paid += Number(r.paid || 0);
      g.payable += Number(r.payable || 0);
      g.remaining = Number(r.remaining || g.remaining || 0);
      g.bills += Number((r.bills || []).length || 0);
    });
    return Array.from(groups.values()).sort((a, b) => `${a.headName}-${a.partyName}`.localeCompare(`${b.headName}-${b.partyName}`));
  }, [contractorRows]);

  const comparisonColumns = [
    { key: "headName", label: "Head" },
    { key: "prevBills", label: "Previous Bills", align: "right", render: (r) => fmt(r.previous.bills) },
    { key: "currentBills", label: "Current Bills", align: "right", render: (r) => fmt(r.current.bills) },
    { key: "billVariance", label: "Bills Change", align: "right", render: (r) => fmt(r.current.bills - r.previous.bills) },
    { key: "prevPaid", label: "Previous Paid", align: "right", render: (r) => fmt(r.previous.paid) },
    { key: "currentPaid", label: "Current Paid", align: "right", render: (r) => fmt(r.current.paid) },
    { key: "paidVariance", label: "Paid Change", align: "right", render: (r) => fmt(r.current.paid - r.previous.paid) },
    { key: "prevPayable", label: "Previous Payable", align: "right", render: (r) => fmt(r.previous.payable) },
    { key: "currentPayable", label: "Current Payable", align: "right", render: (r) => fmt(r.current.payable) },
    { key: "payableVariance", label: "Payable Change", align: "right", render: (r) => fmt(r.current.payable - r.previous.payable) },
  ];

  const contractorColumns = [
    { key: "headName", label: "Head" },
    { key: "partyName", label: "Contractor" },
    { key: "business", label: "Business", align: "right", render: (r) => fmt(r.business) },
    { key: "paid", label: "Paid", align: "right", render: (r) => fmt(r.paid) },
    { key: "payable", label: "Payable", align: "right", render: (r) => fmt(r.payable) },
    { key: "remaining", label: "Party Remaining", align: "right", render: (r) => fmt(r.remaining) },
    { key: "bills", label: "Bills", align: "right" },
  ];

  const title = isComparison ? `Monthly Balance Sheet Comparison — ${months[month - 1].label} ${year}` : `Head-wise Contractor Breakup — ${months[month - 1].label} ${year}`;
  const exportReport = (pdf = false) => {
    if (isComparison) {
      if (!comparisonRows.length) return;
      if (pdf) {
        const rowsForTable = comparisonRows.map((r) => ({ ...r }));
        printDocument({ title: `${title} — ${farm}`, subtitle: `Previous: ${months[(month + 10) % 12].label} ${month === 1 ? year - 1 : year} · Current: ${months[month - 1].label} ${year}`, landscape: true, bodyHtml: tableHtml(comparisonColumns, rowsForTable) });
      } else {
        exportExcel(`Monthly_Balance_Sheet_Comparison_${farm}_${year}_${String(month).padStart(2, "0")}`, comparisonColumns, comparisonRows);
      }
    } else {
      if (!contractorSummary.length) return;
      if (pdf) printDocument({ title: `${title} — ${farm}`, subtitle: `Head-wise contractor business, paid, payable and Party Ledger remaining`, landscape: true, bodyHtml: tableHtml(contractorColumns, contractorSummary) });
      else exportExcel(`Headwise_Contractor_Breakup_${farm}_${year}_${String(month).padStart(2, "0")}`, contractorColumns, contractorSummary);
    }
  };

  return <MainLayout><Box sx={{ px: 3, pt: 1, pb: 4 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 2 }}>
      <Box><Chip icon={<FaBalanceScale />} label="BALANCE SHEET REPORT" sx={{ mb: 1, background: `${brand.gold}22`, border: `1px solid ${brand.gold}`, fontWeight: 800 }} /><Typography variant="h4" fontWeight="bold">{title}</Typography><Typography color="text.secondary" mt={0.5}>{isComparison ? "Compare the selected month with the previous month head-by-head." : "See each contractor's business, paid and payable amounts under every head."}</Typography></Box>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}><Button variant="outlined" startIcon={<FaArrowLeft />} onClick={() => navigate("/ledger/balance-sheet-report")}>Balance Sheet Report</Button><Button variant="outlined" startIcon={<FaSync />} onClick={load}>Refresh</Button></Box>
    </Box>
    <SectionCard title={<><FaBalanceScale style={{ marginRight: 8, verticalAlign: -2 }} />{title}</>} action={<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}><Button size="small" variant="contained" startIcon={<FaFileExcel />} disabled={loading || (isComparison ? !comparisonRows.length : !contractorSummary.length)} onClick={() => exportReport(false)}>Excel</Button><Button size="small" variant="contained" color="error" startIcon={<FaFilePdf />} disabled={loading || (isComparison ? !comparisonRows.length : !contractorSummary.length)} onClick={() => exportReport(true)}>PDF</Button></Box>}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}><TextField fullWidth size="small" select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{months.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={4}><TextField fullWidth size="small" select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField></Grid>
        <Grid item xs={12} md={4}><Box sx={{ height: "100%", display: "flex", alignItems: "center" }}><Chip label={`${months[month - 1].label} ${year}`} sx={{ fontWeight: 800 }} /></Box></Grid>
      </Grid>
      {loading ? <Typography sx={{ py: 6, textAlign: "center" }}>Loading report...</Typography> : isComparison ? (
        !comparisonRows.length ? <Typography sx={{ py: 6, textAlign: "center" }}>No monthly Balance Sheet data found.</Typography> : <Box sx={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}><thead><tr>{comparisonColumns.map((c) => <th key={c.key} style={{ textAlign: c.align || "left", padding: "10px", background: "#f1f6fa", color: "#0F4C81", borderBottom: "1px solid #d9e4ec", fontSize: 12 }}>{c.label}</th>)}</tr></thead><tbody>{comparisonRows.map((r) => <tr key={r.headName}>{comparisonColumns.map((c) => <td key={c.key} style={{ textAlign: c.align || "left", padding: "10px", borderBottom: "1px solid #edf1f4", fontWeight: 600 }}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>)}</tbody></table></Box>
      ) : (
        !contractorSummary.length ? <Typography sx={{ py: 6, textAlign: "center" }}>No contractor breakup found for this month.</Typography> : <Box sx={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}><thead><tr>{contractorColumns.map((c) => <th key={c.key} style={{ textAlign: c.align || "left", padding: "11px", background: "#f1f6fa", color: "#0F4C81", borderBottom: "1px solid #d9e4ec" }}>{c.label}</th>)}</tr></thead><tbody>{contractorSummary.map((r, i) => <tr key={`${r.headName}-${r.partyName}-${i}`}>{contractorColumns.map((c) => <td key={c.key} style={{ textAlign: c.align || "left", padding: "10px", borderBottom: "1px solid #edf1f4", fontWeight: ["business","paid","payable","remaining"].includes(c.key) ? 700 : 400 }}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>)}</tbody></table></Box>
      )}
    </SectionCard>
  </Box></MainLayout>;
}
