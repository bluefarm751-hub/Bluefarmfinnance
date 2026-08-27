import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Chip, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { FaFileExcel, FaFilePdf, FaPrint, FaBook } from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import DateFieldDMY from "../components/DateFieldDMY";
import { SectionCard, DataTable, money, signedMoney } from "../components/CashBook/ui";
import { getBalanceSheet } from "../api/ledgerApi";
import LedgerTabs from "../components/LedgerTabs";
import { exportExcel } from "../utils/exportExcel";
import { printDocument, tableHtml } from "../utils/print";
import { useToast } from "../utils/useToast";
import { brand } from "../theme";
import { months, years, currentYearValue, monthRange } from "../utils/ledgerFilters";

const HEAD_COLORS = [
  { bg: "linear-gradient(135deg,#1E88E5 0%,#1565C0 100%)", soft: "#EAF3FF", border: "#8CB9EE" },
  { bg: "linear-gradient(135deg,#2FBF71 0%,#1B8A50 100%)", soft: "#EAF9F0", border: "#8BD5AB" },
  { bg: "linear-gradient(135deg,#A24BD1 0%,#7A1FA2 100%)", soft: "#F5ECFB", border: "#C9A0E2" },
  { bg: "linear-gradient(135deg,#F0574D 0%,#C0392B 100%)", soft: "#FDEDEC", border: "#E8A29C" },
  { bg: "linear-gradient(135deg,#D9B64A 0%,#B8912C 100%)", soft: "#FFF8DE", border: "#E3C86A" },
  { bg: "linear-gradient(135deg,#16608f 0%,#12507a 100%)", soft: "#EAF5FA", border: "#8CBFD9" },
  { bg: "linear-gradient(135deg,#00897B 0%,#00695C 100%)", soft: "#E7F7F4", border: "#86CFC5" },
  { bg: "linear-gradient(135deg,#EF6C00 0%,#E65100 100%)", soft: "#FFF0E2", border: "#F2B27C" },
];

const columns = [
  { key: "date", label: "Date" },
  { key: "voucherNo", label: "Voucher No" },
  { key: "party", label: "Party" },
  { key: "description", label: "Description" },
  { key: "source", label: "Source" },
  { key: "debit", label: "Debit", align: "right", render: (r) => (r.debit ? money(r.debit) : "") },
  { key: "credit", label: "Credit", align: "right", render: (r) => (r.credit ? money(r.credit) : "") },
  { key: "balance", label: "Balance", align: "right", render: (r) => signedMoney(r.balance) },
];

export default function GeneralLedger() {
  const navigate = useNavigate();
  const { ToastUI } = useToast();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const [data, setData] = useState({ rows: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [openHead, setOpenHead] = useState(null);
  const [month, setMonth] = useState(0);
  const [year, setYear] = useState(currentYearValue);

  const load = async () => {
    setLoading(true);
    try {
      const { fromDate, toDate } = monthRange(month, year);
      const res = await getBalanceSheet({ fromDate, toDate });
      const next = res.data || { rows: [], totals: {} };
      setData(next);
      if (openHead === null && next.rows?.length) setOpenHead(next.rows[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month, year]);

  const rows = data.rows || [];
  const totals = data.totals || {};
  const fmt = (v) => `Rs. ${Number(v || 0).toLocaleString()}`;

  const exportRows = useMemo(() => rows.flatMap((head) => (head.bills || []).map((bill) => ({
    headName: head.headName,
    billNo: bill.billNo,
    billDate: bill.billDate || "—",
    contractorName: bill.contractorName || "—",
    item: bill.item || bill.remarks || "—",
    status: bill.status || "Payable",
    amount: Number(bill.amount || 0),
  }))), [rows]);

  const exportColumns = [
    { key: "headName", label: "Head" },
    { key: "billNo", label: "Bill No" },
    { key: "billDate", label: "Date" },
    { key: "contractorName", label: "Contractor" },
    { key: "item", label: "Description" },
    { key: "status", label: "Status" },
    { key: "amount", label: "Bill Amount", align: "right", render: (r) => fmt(r.amount) },
  ];

  const periodLabel = month ? `${months[month - 1].label} ${year}` : "All Months";
  const runExcel = () => {
    if (!exportRows.length) return;
    exportExcel(`${farm.replace(/\s+/g, "_")}_Main_Ledger_${month ? `${year}_${String(month).padStart(2, "0")}` : "All"}`, exportColumns, exportRows);
  };
  const runPrint = () => {
    if (!exportRows.length) return;
    printDocument({
      title: `Main Ledger — ${farm}`,
      subtitle: periodLabel,
      landscape: true,
      bodyHtml: tableHtml(exportColumns, exportRows),
    });
  };

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 4 }}>
        <Typography variant="h4" fontWeight="bold" mb={0.5}>Main Ledger</Typography>
        <Typography color="text.secondary" mb={2.5}>
          All Heads are loaded automatically from added bills. Select a month to view that period, or keep All Months to view the complete ledger.
        </Typography>
        <LedgerTabs />
        <Box sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: "wrap", mb: 2.5 }}>
          <TextField size="small" select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))} sx={{ minWidth: 170 }}>
            <MenuItem value={0}>All Months</MenuItem>
            {months.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </TextField>
          <TextField size="small" select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ minWidth: 130 }} disabled={!month}>
            {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
          <Box sx={{ ml: { xs: 0, md: "auto" }, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button size="small" variant="contained" startIcon={<FaFileExcel />} sx={{ background: "#1E8E5A", color: "#fff", "&:hover": { background: "#166A44" } }} onClick={runExcel} disabled={!exportRows.length}>Excel</Button>
            <Button size="small" variant="contained" startIcon={<FaFilePdf />} sx={{ background: "#C0392B", color: "#fff", "&:hover": { background: "#96281B" } }} onClick={() => navigate("/ledger/report-pdf")}>PDF</Button>
            <Button size="small" variant="contained" startIcon={<FaPrint />} sx={{ background: "#0F4C81", color: "#fff", "&:hover": { background: "#08213F" } }} onClick={runPrint} disabled={!exportRows.length}>Print</Button>
          </Box>
        </Box>

        <SectionCard title={<><FaBook style={{ marginRight: 8, verticalAlign: -2 }} />Main Ledger — {farm}</>}>
          {loading ? <Typography sx={{ py: 6, textAlign: "center" }}>Loading ledger...</Typography> : !rows.length ? (
            <Typography sx={{ py: 6, textAlign: "center" }}>No Heads or Bills found.</Typography>
          ) : (
            <>
              <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", mb: 2.5 }}>
                {rows.map((head, index) => {
                  const c = HEAD_COLORS[index % HEAD_COLORS.length];
                  const active = openHead === head.id;
                  return (
                    <Button
                      key={head.id}
                      size="small"
                      variant="contained"
                      onClick={() => setOpenHead(head.id)}
                      sx={{
                        minHeight: 42, px: 2, borderRadius: 2.5, textTransform: "none", fontWeight: 900,
                        color: active ? "#fff" : "#18344d",
                        background: active ? c.bg : c.soft,
                        border: `2px solid ${active ? "rgba(255,255,255,.3)" : c.border}`,
                        boxShadow: active ? "0 8px 18px rgba(8,33,63,.22)" : "0 3px 8px rgba(8,33,63,.08)",
                        "&:hover": { background: c.bg, color: "#fff", transform: "translateY(-2px)" },
                        transition: "all .18s",
                      }}
                    >
                      {head.headName}
                    </Button>
                  );
                })}
              </Box>

              <Box sx={{ mb: 2.5, p: 2, borderRadius: 3, background: "#f1f6fa", display: "flex", gap: 3, flexWrap: "wrap" }}>
                <Typography fontWeight={800}>Total Heads: {rows.length}</Typography>
                <Typography fontWeight={800}>Total Head Balance: {fmt(totals.totalAmount)}</Typography>
                <Typography fontWeight={800}>Bills: {fmt(totals.billAmount)}</Typography>
                <Typography fontWeight={800}>Final Remaining: {fmt(totals.remaining)}</Typography>
                <Typography fontWeight={800} color="#C0392B">Payable included: {fmt(totals.payableAmount)}</Typography>
              </Box>

              {rows.filter((r) => openHead === null || r.id === openHead).map((head) => {
                let running = Number(head.totalAmount || 0);
                const billRows = (head.bills || []).map((bill) => {
                  running -= Number(bill.amount || 0);
                  return { ...bill, __running: running };
                });
                const billColumns = [
                  { key: "billNo", label: "Bill No", render: (r) => <span style={{ fontWeight: 800 }}>{r.billNo}</span> },
                  { key: "billDate", label: "Date", render: (r) => r.billDate || "\u2014" },
                  { key: "contractorName", label: "Contractor", render: (r) => r.contractorName || "\u2014" },
                  { key: "item", label: "Description", render: (r) => r.item || r.remarks || "\u2014" },
                  { key: "status", label: "Status", render: (r) => <Chip size="small" label={r.status || "Payable"} color={String(r.status).toLowerCase() === "paid" ? "success" : "error"} variant="outlined" /> },
                  { key: "amount", label: "Bill Amount", align: "right", render: (r) => fmt(r.amount) },
                  { key: "remaining", label: "Remaining Amount", align: "right", render: (r) => <span style={{ fontWeight: 900, color: r.__running < 0 ? "#C0392B" : "#1B5E3B" }}>{fmt(r.__running)}</span> },
                ];
                return (
                  <Box key={head.id} sx={{ border: `1px solid ${brand.tableCardBorder}`, borderRadius: 3, overflow: "hidden", mb: 2.5, boxShadow: "0 10px 30px rgba(8,33,63,0.18)" }}>
                    <Box sx={{ p: 2, background: "linear-gradient(135deg,#0F4C81 0%,#16608f 100%)", color: "#fff", display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                      <Box><Typography fontWeight={900} fontSize={19}>{head.headName}</Typography><Typography fontSize={12.5}>Opening / Full Head Balance: {fmt(head.totalAmount)}</Typography></Box>
                      <Box sx={{ textAlign: { xs: "left", sm: "right" } }}><Typography fontWeight={900}>Final Remaining: {fmt(head.remaining)}</Typography><Typography fontSize={12.5}>Payable: {fmt(head.payableAmount)}</Typography></Box>
                    </Box>
                    {!head.bills?.length ? <Typography sx={{ p: 3, background: brand.panelSoft }}>No bills under this Head.</Typography> : (
                      <Box sx={{ p: 1.5, background: brand.panelSoft }}>
                        <DataTable
                          columns={billColumns}
                          rows={billRows}
                          totalsRow={{
                            billNo: "Head Final Balance",
                            amount: fmt(head.billAmount),
                            remaining: <span style={{ color: head.remaining < 0 ? "#FFD2D2" : "#fff" }}>{fmt(head.remaining)}</span>,
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                );
              })}
            </>
          )}
        </SectionCard>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
