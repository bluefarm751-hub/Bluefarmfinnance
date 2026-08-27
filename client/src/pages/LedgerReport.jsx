import { useEffect, useMemo, useState } from "react";
import { Box, Button, Chip, Grid, TextField, Typography } from "@mui/material";
import { FaBook, FaFileExcel, FaFilePdf, FaArrowLeft } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import LedgerTabs from "../components/LedgerTabs";
import DateFieldDMY from "../components/DateFieldDMY";
import { SectionCard } from "../components/CashBook/ui";
import { getGeneralLedger } from "../api/ledgerApi";
import { exportXlsx } from "../utils/xlsxWriter";
import { downloadMultiSectionPdf } from "../utils/multiSectionPdf";
import { brand } from "../theme";

const money = (v) => Number(v || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });

const columns = [
  { key: "sNo", label: "S.No", width: 9 },
  { key: "date", label: "Date", width: 13 },
  { key: "voucherNo", label: "Voucher No", width: 17 },
  { key: "party", label: "Party", width: 24 },
  { key: "description", label: "Description", width: 35 },
  { key: "source", label: "Source", width: 22 },
  { key: "debit", label: "Debit", width: 16, align: "right" },
  { key: "credit", label: "Credit", width: 16, align: "right" },
  { key: "balance", label: "Balance", width: 18, align: "right" },
];

export default function LedgerReport({ mode = "excel" }) {
  const navigate = useNavigate();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const [filters, setFilters] = useState({ from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getGeneralLedger(filters);
      setRows(res.data || []);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filters]);

  const reportRows = useMemo(() => rows.map((r, i) => ({
    sNo: i + 1,
    date: r.date || "",
    voucherNo: r.voucherNo || "",
    party: r.party || "",
    description: r.description || "",
    source: r.source || "",
    debit: Number(r.debit || 0),
    credit: Number(r.credit || 0),
    balance: Number(r.balance || 0),
  })), [rows]);

  const totals = useMemo(() => reportRows.reduce((a, r) => {
    a.debit += r.debit;
    a.credit += r.credit;
    a.balance = r.balance;
    return a;
  }, { debit: 0, credit: 0, balance: 0 }), [reportRows]);

  const subtitle = `${farm} · ${filters.from || "Beginning"} to ${filters.to || "Current"}`;

  const handleExcel = async () => {
    const exportColumns = columns.map((c) => ({ ...c }));
    await exportXlsx({
      filename: `${farm.replace(/\s+/g, "_")}_Ledger_Report`,
      columns: exportColumns,
      rows: reportRows,
      title: `${farm} Ledger Report`,
      subtitle,
    });
  };

  const handlePdf = () => {
    downloadMultiSectionPdf({
      filename: `${farm.replace(/\s+/g, "_")}_Ledger_Report.pdf`,
      docTitle: `${farm} Ledger Report`,
      sections: [{
        title: `${farm} Ledger Report`,
        subtitle,
        columns: columns.map((c) => ({ ...c })),
        rows: [
          ...reportRows,
          { sNo: "", date: "", voucherNo: "", party: "", description: "TOTAL", source: "", debit: totals.debit, credit: totals.credit, balance: totals.balance, __bold: true },
        ],
      }],
    });
  };

  const isExcel = mode === "excel";

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 4 }}>
        <LedgerTabs />
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 1 }}>
          <Box>
            <Chip icon={<FaBook />} label="LEDGER REPORTS" sx={{ mb: 1, background: `${brand.gold}22`, border: `1px solid ${brand.gold}`, color: brand.goldDark, fontWeight: 800 }} />
            <Typography variant="h4" fontWeight="bold">Ledger Report — {isExcel ? "Excel" : "PDF"}</Typography>
            <Typography color="text.secondary" mt={0.5}>Separate export report for the General Ledger. Party Ledger remains a separate ledger.</Typography>
          </Box>
          <Button variant="outlined" startIcon={<FaArrowLeft />} onClick={() => navigate("/ledger")}>Back to Ledger</Button>
        </Box>

        <SectionCard title={`${farm} — ${isExcel ? "Excel Report" : "PDF Report"}`}>
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid item xs={12} md={4}><DateFieldDMY label="From Date" value={filters.from} onChange={(v) => setFilters((p) => ({ ...p, from: v }))} /></Grid>
            <Grid item xs={12} md={4}><DateFieldDMY label="To Date" value={filters.to} onChange={(v) => setFilters((p) => ({ ...p, to: v }))} /></Grid>
            <Grid item xs={12} md={4} sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Button variant="contained" startIcon={isExcel ? <FaFileExcel /> : <FaFilePdf />} onClick={isExcel ? handleExcel : handlePdf} disabled={!reportRows.length || loading} sx={{ background: isExcel ? "#1B8A50" : "#C0392B", "&:hover": { background: isExcel ? "#14683A" : "#96281B" } }}>
                Download {isExcel ? "Excel" : "PDF"}
              </Button>
              <Button variant="outlined" onClick={() => setFilters({ from: "", to: "" })}>Clear Dates</Button>
            </Grid>
          </Grid>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            <Chip label={`Entries: ${reportRows.length}`} />
            <Chip label={`Debit: Rs. ${money(totals.debit)}`} color="success" variant="outlined" />
            <Chip label={`Credit: Rs. ${money(totals.credit)}`} color="error" variant="outlined" />
            <Chip label={`Balance: Rs. ${money(totals.balance)}`} color="primary" variant="outlined" />
          </Box>

          <Box sx={{ overflowX: "auto", border: "1px solid #d9e4ec", borderRadius: 2 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
              <thead>
                <tr>
                  {columns.map((c) => <th key={c.key} style={{ padding: "11px 9px", background: "#0F4C81", color: "#fff", textAlign: c.align === "right" ? "right" : "left", fontSize: 12 }}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {!loading && !reportRows.length && <tr><td colSpan={columns.length} style={{ padding: 30, textAlign: "center", color: "#6B7280" }}>No ledger entries found for the selected dates.</td></tr>}
                {reportRows.map((r) => <tr key={`${r.sNo}-${r.voucherNo}`}>
                  {columns.map((c) => <td key={c.key} style={{ padding: "9px", borderTop: "1px solid #edf1f4", textAlign: c.align === "right" ? "right" : "left", fontSize: 12.5 }}>{["debit","credit","balance"].includes(c.key) ? money(r[c.key]) : r[c.key]}</td>)}
                </tr>)}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ padding: "12px 9px", borderTop: `2px solid ${brand.gold}`, fontWeight: 900 }}>TOTAL</td>
                  <td style={{ padding: "12px 9px", borderTop: `2px solid ${brand.gold}`, textAlign: "right", fontWeight: 900 }}>{money(totals.debit)}</td>
                  <td style={{ padding: "12px 9px", borderTop: `2px solid ${brand.gold}`, textAlign: "right", fontWeight: 900 }}>{money(totals.credit)}</td>
                  <td style={{ padding: "12px 9px", borderTop: `2px solid ${brand.gold}`, textAlign: "right", fontWeight: 900 }}>{money(totals.balance)}</td>
                </tr>
              </tfoot>
            </table>
          </Box>
        </SectionCard>
      </Box>
    </MainLayout>
  );
}
