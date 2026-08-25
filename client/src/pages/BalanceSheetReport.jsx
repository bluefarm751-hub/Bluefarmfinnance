import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { FaArrowLeft, FaBalanceScale, FaFileExcel, FaFilePdf, FaPrint, FaSync } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import LedgerTabs from "../components/LedgerTabs";
import { SectionCard } from "../components/CashBook/ui";
import { getBalanceSheet } from "../api/ledgerApi";
import { exportExcel } from "../utils/exportExcel";
import { printDocument, tableHtml } from "../utils/print";
import { brand } from "../theme";
import { useToast } from "../utils/useToast";

const fmt = (v) => Number(v || 0).toLocaleString();
const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(2000, i, 1).toLocaleString("en", { month: "long" }) }));
const thisYear = new Date().getFullYear();
const years = Array.from({ length: 8 }, (_, i) => thisYear - 5 + i);
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const columns = [
  { key: "headName", label: "Head" },
  { key: "totalAmount", label: "Total Head Amount", align: "right", render: (r) => fmt(r.totalAmount) },
  { key: "billAmount", label: "Total Bills", align: "right", render: (r) => fmt(r.billAmount) },
  { key: "paidAmount", label: "Paid", align: "right", render: (r) => fmt(r.paidAmount) },
  { key: "payableAmount", label: "Payable", align: "right", render: (r) => fmt(r.payableAmount) },
  { key: "remaining", label: "Remaining Balance", align: "right", render: (r) => fmt(r.remaining) },
];

const detailColumns = [
  { key: "headName", label: "Head" },
  { key: "billDate", label: "Date" },
  { key: "billNo", label: "Bill No" },
  { key: "contractorName", label: "Contractor" },
  { key: "item", label: "Description" },
  { key: "amount", label: "Amount", align: "right", render: (r) => fmt(r.amount) },
  { key: "status", label: "Status" },
];

export default function BalanceSheetReport() {
  const navigate = useNavigate();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const { ToastUI } = useToast();
  const now = new Date();
  const [filterMode, setFilterMode] = useState("all");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState({ rows: [], totals: {}, fromDate: "", toDate: "" });
  const [loading, setLoading] = useState(true);

  const effectiveDates = useMemo(() => {
    if (filterMode === "month") {
      const first = new Date(year, month - 1, 1);
      const last = new Date(year, month, 0);
      return { fromDate: iso(first), toDate: iso(last) };
    }
    if (filterMode === "custom") return { fromDate, toDate };
    return { fromDate: "", toDate: "" };
  }, [filterMode, month, year, fromDate, toDate]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getBalanceSheet(effectiveDates);
      setData(r.data || { rows: [], totals: {} });
    } catch (e) {
      console.error(e);
      setData({ rows: [], totals: {} });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterMode, month, year]);

  const rows = useMemo(() => (data.rows || []).map((r) => ({
    headName: r.headName,
    totalAmount: Number(r.totalAmount || 0),
    billAmount: Number(r.billAmount || 0),
    paidAmount: Number(r.paidAmount || 0),
    payableAmount: Number(r.payableAmount || 0),
    remaining: Number(r.remaining || 0),
    bills: r.bills || [],
  })), [data.rows]);
  const detailRows = useMemo(() => rows.flatMap((r) => r.bills.map((b) => ({ ...b, headName: r.headName }))), [rows]);
  const totals = data.totals || {};
  const filterLabel = filterMode === "month" ? `${months[month - 1].label} ${year}` : filterMode === "custom" ? `${fromDate || "Start"} to ${toDate || "End"}` : "All Dates";

  const exportExcelReport = () => {
    const summaryRows = rows.map((r) => ({
      headName: r.headName, totalAmount: r.totalAmount, billAmount: r.billAmount, paidAmount: r.paidAmount, payableAmount: r.payableAmount, remaining: r.remaining,
    }));
    const rowsForExport = [...summaryRows, ...detailRows.map((r) => ({ headName: `  └ ${r.headName}`, totalAmount: "", billAmount: r.amount, paidAmount: String(r.status).toLowerCase() === "paid" ? r.amount : 0, payableAmount: String(r.status).toLowerCase() === "paid" ? 0 : r.amount, remaining: "" }))];
    exportExcel(`Balance_Sheet_Report_${farm}_${filterLabel.replace(/\s+/g, "_")}`, columns, rowsForExport);
  };

  const exportPdfReport = () => {
    const summaryHtml = tableHtml(columns, rows.map((r) => ({ ...r })));
    const detailHtml = detailRows.length ? `<h3 style="margin:24px 0 8px">Head-wise Detailed Bill Breakup</h3>${tableHtml(detailColumns, detailRows)}` : "";
    printDocument({ title: `Balance Sheet Report — ${farm}`, subtitle: `${filterLabel} · Head-wise balance and detailed bill breakup`, landscape: true, bodyHtml: summaryHtml + detailHtml });
  };

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 4 }}>
        <LedgerTabs />
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold">Balance Sheet Report</Typography>
            <Typography color="text.secondary">Head-wise balances with date/month filtering and detailed bill breakup for {farm}.</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button variant="outlined" startIcon={<FaArrowLeft />} onClick={() => navigate("/ledger/balance-sheet")}>Balance Sheet</Button>
            <Button variant="outlined" startIcon={<FaSync />} onClick={load}>Refresh</Button>
          </Box>
        </Box>

        <SectionCard
          title={<><FaBalanceScale style={{ marginRight: 8, verticalAlign: -2 }} />Balance Sheet Report — {farm}</>}
          action={
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button size="small" variant="contained" startIcon={<FaFileExcel />} onClick={exportExcelReport} disabled={!rows.length}>Excel Report</Button>
              <Button size="small" variant="contained" color="error" startIcon={<FaFilePdf />} onClick={exportPdfReport} disabled={!rows.length}>PDF Report</Button>
              <Button size="small" variant="outlined" startIcon={<FaPrint />} onClick={exportPdfReport} disabled={!rows.length}>Print</Button>
            </Box>
          }
        >
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}><TextField fullWidth size="small" select label="Report Period" value={filterMode} onChange={(e) => setFilterMode(e.target.value)}><MenuItem value="all">All Dates</MenuItem><MenuItem value="month">Month / Year</MenuItem><MenuItem value="custom">Custom Date Range</MenuItem></TextField></Grid>
            {filterMode === "month" && <><Grid item xs={12} sm={6} md={2}><TextField fullWidth size="small" select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>{months.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}</TextField></Grid><Grid item xs={12} sm={6} md={2}><TextField fullWidth size="small" select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>{years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}</TextField></Grid></>}
            {filterMode === "custom" && <><Grid item xs={12} sm={6} md={2.5}><TextField fullWidth size="small" type="date" label="From Date" InputLabelProps={{ shrink: true }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></Grid><Grid item xs={12} sm={6} md={2.5}><TextField fullWidth size="small" type="date" label="To Date" InputLabelProps={{ shrink: true }} value={toDate} onChange={(e) => setToDate(e.target.value)} /></Grid><Grid item xs={12} md={2}><Button fullWidth variant="contained" onClick={load}>Apply Dates</Button></Grid></>}
          </Grid>

          <Box sx={{ mb: 2 }}><Chip label={`Showing: ${filterLabel}`} sx={{ background: `${brand.gold}22`, border: `1px solid ${brand.gold}`, fontWeight: 700 }} /></Box>

          {loading ? (
            <Typography sx={{ py: 5, textAlign: "center" }}>Loading balance sheet report...</Typography>
          ) : !rows.length ? (
            <Box sx={{ py: 6, textAlign: "center", borderRadius: 3, border: `1.5px dashed ${brand.gold}` }}><Typography fontWeight={700}>No balance sheet data found for {farm} in this period.</Typography></Box>
          ) : (
            <>
              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                  <thead><tr>{["Head", "Total Head Amount", "Total Bills", "Paid", "Payable", "Remaining Balance"].map((h) => <th key={h} style={{ textAlign: h === "Head" ? "left" : "right", padding: "12px 10px", background: "#f1f6fa", color: "#0F4C81", borderBottom: "1px solid #d9e4ec" }}>{h}</th>)}</tr></thead>
                  <tbody>{rows.map((r) => <tr key={r.headName}><td style={{ padding: 12, borderBottom: "1px solid #edf1f4", fontWeight: 800 }}>{r.headName}</td><td style={{ padding: 12, textAlign: "right", borderBottom: "1px solid #edf1f4" }}>{fmt(r.totalAmount)}</td><td style={{ padding: 12, textAlign: "right", borderBottom: "1px solid #edf1f4" }}>{fmt(r.billAmount)}</td><td style={{ padding: 12, textAlign: "right", borderBottom: "1px solid #edf1f4" }}><Chip size="small" label={fmt(r.paidAmount)} color="success" variant="outlined" /></td><td style={{ padding: 12, textAlign: "right", borderBottom: "1px solid #edf1f4" }}><Chip size="small" label={fmt(r.payableAmount)} color="error" variant="outlined" /></td><td style={{ padding: 12, textAlign: "right", borderBottom: "1px solid #edf1f4", fontWeight: 900, color: r.remaining < 0 ? "#C0392B" : "#1B5E3B" }}>{fmt(r.remaining)}</td></tr>)}</tbody>
                  <tfoot><tr><td style={{ padding: 12, fontWeight: 900 }}>TOTAL</td><td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{fmt(totals.totalAmount)}</td><td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{fmt(totals.billAmount)}</td><td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{fmt(totals.paidAmount)}</td><td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{fmt(totals.payableAmount)}</td><td style={{ padding: 12, textAlign: "right", fontWeight: 900 }}>{fmt(totals.remaining)}</td></tr></tfoot>
                </table>
              </Box>

              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 1.5 }}>Head-wise Detailed Bill Breakup</Typography>
                {rows.map((r) => (
                  <Box key={`detail-${r.headName}`} sx={{ mb: 2.5, border: "1px solid #d9e4ec", borderRadius: 2, overflow: "hidden" }}>
                    <Box sx={{ px: 2, py: 1.5, background: "#f1f6fa", display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}><Typography fontWeight={900}>{r.headName}</Typography><Typography fontWeight={800}>Head Balance: {fmt(r.remaining)} · Bills: {r.bills.length}</Typography></Box>
                    {!r.bills.length ? <Typography sx={{ p: 2 }} color="text.secondary">No bills in this period.</Typography> : <Box sx={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Date", "Bill No", "Contractor", "Description", "Amount", "Status"].map((h) => <th key={h} style={{ textAlign: h === "Amount" ? "right" : "left", padding: "9px 10px", borderBottom: "1px solid #e5ebf0", fontSize: 12, color: "#0F4C81" }}>{h}</th>)}</tr></thead><tbody>{r.bills.map((b) => <tr key={b.id}><td style={{ padding: 9 }}>{b.billDate || "—"}</td><td style={{ padding: 9 }}>{b.billNo}</td><td style={{ padding: 9 }}>{b.contractorName || "—"}</td><td style={{ padding: 9 }}>{b.item || b.remarks || "—"}</td><td style={{ padding: 9, textAlign: "right", fontWeight: 800 }}>{fmt(b.amount)}</td><td style={{ padding: 9 }}>{b.status || "Payable"}</td></tr>)}</tbody></table></Box>}
                  </Box>
                ))}
              </Box>
            </>
          )}
        </SectionCard>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
