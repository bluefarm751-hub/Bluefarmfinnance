import { useEffect, useState } from "react";
import { Box, Button, Grid, MenuItem, TextField, Typography, IconButton, Collapse } from "@mui/material";
import { FaTrashAlt, FaFileExcel, FaFilePdf, FaPrint, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { SectionCard, DataTable, money } from "./ui";
import {
  getMonthlySummary,
  getMonthlyClosings,
  saveMonthlyClosing,
  deleteMonthlyClosing,
  getReceipts,
  getPayments,
  getTRs,
  getClosingSummary,
  getCashSummary,
  getClosings,
} from "../../api/cashbookApi";
import { exportExcel } from "../../utils/exportExcel";
import { exportXlsxMultiSheet } from "../../utils/xlsxWriter";
import { downloadMultiSectionPdf } from "../../utils/multiSectionPdf";
import { printDocument } from "../../utils/print";
import { brand } from "../../theme";
import ConfirmDialog from "../ConfirmDialog";

// Same columns used across the Receipt / Payment side reports elsewhere in
// the app, so the monthly workbook's sheets match what the daily side tabs
// already show.
const sideCols = [
  { key: "date", label: "Date", width: 12 },
  { key: "voucherNo", label: "Voucher No", width: 14 },
  { key: "party", label: "Contractor / Party", width: 22 },
  { key: "description", label: "Description", width: 26 },
  { key: "head", label: "Head", width: 16 },
  { key: "farm", label: "Farm", width: 14 },
  { key: "sourceTag", label: "Source", width: 12 },
  { key: "cash", label: "Cash", width: 14 },
  { key: "bank", label: "Bank", width: 14 },
];

const trCols = [
  { key: "entryDate", label: "Date", width: 12 },
  { key: "description", label: "Description", width: 26 },
  { key: "issuedTo", label: "Issued To", width: 20 },
  { key: "amount", label: "Amount", width: 14 },
  { key: "authority", label: "Authority", width: 18 },
  { key: "status", label: "Status", width: 14 },
];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Same denomination list as the Daily Closing tab, so the physical cash
// count block on the Closing Summary sheet matches it note-for-note.
const NOTES = [5000, 1000, 500, 100, 50, 20, 10];
const COINS = [5, 2, 1];
const DENOMS = [...NOTES, ...COINS];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MonthlyClosingTab({ onChanged, showToast }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [remarks, setRemarks] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const res = await getMonthlySummary(month, year);
      setPreview(res.data);
    } catch (e) {
      console.log(e);
      showToast?.("Failed to load monthly summary", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await getMonthlyClosings();
      setHistory(res.data || []);
    } catch (e) { console.log(e); }
  };

  useEffect(() => { loadPreview(); /* eslint-disable-next-line */ }, [month, year]);
  useEffect(() => { loadHistory(); }, []);

  // Builds the shared data for the 4-section "Monthly Closing Main Report":
  //   1. Receipt Side  — every receipt entry for the month
  //   2. Payment Side  — every payment entry for the month
  //   3. Outstanding TRs — Temporary Receipts still not cleared, as of month end
  //   4. Closing Summary — same page/formula as Daily Closing, run as of the
  //      month's last date: physical cash count (denominations), Cash,
  //      TR, Cash In Hand, Cash In Bank, TOTAL — using the Daily Closing
  //      saved for that date if one exists.
  // Used by both the Excel (multi-sheet workbook) and PDF (multi-section)
  // exports below, so the two formats always show the exact same figures
  // from one API round-trip, and returns a `sheets` array whose shape
  // (name/title/subtitle/columns/rows) each exporter consumes directly.
  const buildMonthlyReportSheets = async () => {
    if (!preview) return null;
    const { fromDate, toDate } = preview;
    const num = (v) => Number(v || 0);

    const [receiptsRes, paymentsRes, trsRes, closingSummaryRes, bankInfoRes, savedClosingsRes] = await Promise.all([
      getReceipts({ from: fromDate, to: toDate }),
      getPayments({ from: fromDate, to: toDate }),
      getTRs({ to: toDate, status: "Not Cleared" }),
      getClosingSummary(toDate),
      getCashSummary(toDate),
      getClosings({ from: toDate, to: toDate }),
    ]);

    const receiptRows = (receiptsRes.data || []).map((r) => ({ ...r, cash: num(r.cash), bank: num(r.bank) }));
    const paymentRows = (paymentsRes.data || []).map((r) => ({ ...r, cash: num(r.cash), bank: num(r.bank) }));
    const trRows = (trsRes.data || []).map((r) => ({ ...r, amount: num(r.amount) }));

    const receiptTotalRow = { date: "", voucherNo: "", party: "", description: "", head: "", farm: "", sourceTag: "TOTAL", cash: round2(receiptRows.reduce((t, r) => t + r.cash, 0)), bank: round2(receiptRows.reduce((t, r) => t + r.bank, 0)), __bold: true };
    const paymentTotalRow = { date: "", voucherNo: "", party: "", description: "", head: "", farm: "", sourceTag: "TOTAL", cash: round2(paymentRows.reduce((t, r) => t + r.cash, 0)), bank: round2(paymentRows.reduce((t, r) => t + r.bank, 0)), __bold: true };
    const trTotalRow = { entryDate: "", description: "", issuedTo: "", amount: round2(trRows.reduce((t, r) => t + r.amount, 0)), authority: "", status: "TOTAL OUTSTANDING", __bold: true };

    // ---- Section 4: same page as Daily Closing, run as of the month's last date ----
    const cs = closingSummaryRes.data || {};
    const bankInfo = bankInfoRes.data || {};
    const savedClosing = (savedClosingsRes.data || [])
      .filter((r) => String(r.closingDate).slice(0, 10) === toDate)
      .sort((a, b) => b.id - a.id)[0] || null;

    const expected = round2(cs.expectedCash);
    const trAmt = round2(cs.trIssued); // outstanding TR, as returned by the daily closing-summary endpoint
    const cashInBank = round2(bankInfo.cashInBank);
    const cashInHandGross = round2(expected + trAmt);
    const grandTotal = round2(bankInfo.totalBalance ?? cashInHandGross + cashInBank);

    let counts = {};
    let actualCash = null;
    let difference = null;
    if (savedClosing) {
      try { counts = JSON.parse(savedClosing.denominations || "{}"); } catch { counts = {}; }
      actualCash = round2(savedClosing.actualCash);
      difference = round2(savedClosing.difference);
    }

    const closingCols = [
      { key: "particulars", label: "Particulars", width: 30 },
      { key: "qty", label: "Qty", width: 10 },
      { key: "amount", label: "Amount", width: 16 },
    ];

    const denomRows = DENOMS.map((d) => {
      const qty = Number(counts[d]) || 0;
      return { particulars: `Rs. ${d.toLocaleString()}`, qty, amount: round2(d * qty) };
    });

    const closingRows = [
      { particulars: "CASH IN HAND — PHYSICAL COUNT", qty: "", amount: "", __bold: true },
      ...denomRows,
      { particulars: "Total", qty: "", amount: actualCash !== null ? actualCash : "", __bold: true },
      { particulars: "Differ", qty: "", amount: difference !== null ? difference : "", __bold: true },
      { particulars: "", qty: "", amount: "" },
      { particulars: "Cash", qty: "", amount: expected, __bold: true },
      { particulars: "TR", qty: "", amount: trAmt, __bold: true },
      { particulars: "Cash In Hand", qty: "", amount: cashInHandGross, __bold: true },
      { particulars: "", qty: "", amount: "" },
      { particulars: "Cash In Bank", qty: "", amount: cashInBank, __bold: true },
      { particulars: "", qty: "", amount: "" },
      { particulars: "TOTAL", qty: "", amount: grandTotal, __bold: true },
      { particulars: "", qty: "", amount: "" },
      {
        particulars: savedClosing
          ? `Physical count from Daily Closing saved on ${toDate}`
          : `No Daily Closing saved on ${toDate} — physical count not available; Total/Differ left blank`,
        qty: "", amount: "",
      },
    ];

    return {
      fromDate,
      toDate,
      sheets: [
        {
          name: "Receipt Side",
          title: `Receipt Side — ${MONTHS[month - 1]} ${year}`,
          subtitle: `${fromDate} to ${toDate}`,
          columns: sideCols,
          rows: [...receiptRows, receiptTotalRow],
        },
        {
          name: "Payment Side",
          title: `Payment Side — ${MONTHS[month - 1]} ${year}`,
          subtitle: `${fromDate} to ${toDate}`,
          columns: sideCols,
          rows: [...paymentRows, paymentTotalRow],
        },
        {
          name: "Outstanding TRs",
          title: `Outstanding TRs — as of ${toDate}`,
          subtitle: `${MONTHS[month - 1]} ${year} Closing`,
          columns: trCols,
          rows: [...trRows, trTotalRow],
        },
        {
          name: "Closing Summary",
          title: `Daily Closing — ${toDate}`,
          subtitle: `Month-end Cash Book Closing for ${MONTHS[month - 1]} ${year}`,
          columns: closingCols,
          rows: closingRows,
        },
      ],
    };
  };

  const exportMonthlyReport = async () => {
    if (!preview) return;
    setExporting(true);
    try {
      const data = await buildMonthlyReportSheets();
      if (!data) return;
      await exportXlsxMultiSheet({
        filename: `Monthly_Closing_Report_${MONTHS[month - 1]}_${year}`,
        sheets: data.sheets,
      });
      showToast?.("Monthly closing report downloaded", "success");
    } catch (e) {
      console.log(e);
      showToast?.("Failed to build monthly closing report", "error");
    } finally {
      setExporting(false);
    }
  };

  const exportMonthlyReportPdf = async () => {
    if (!preview) return;
    setExportingPdf(true);
    try {
      const data = await buildMonthlyReportSheets();
      if (!data) return;
      downloadMultiSectionPdf({
        filename: `Monthly_Closing_Report_${MONTHS[month - 1]}_${year}`,
        docTitle: `Monthly Closing Report — ${MONTHS[month - 1]} ${year}`,
        sections: data.sheets.map((s) => ({ title: s.title, subtitle: s.subtitle, columns: s.columns, rows: s.rows })),
      });
      showToast?.("Monthly closing PDF downloaded", "success");
    } catch (e) {
      console.log(e);
      showToast?.("Failed to build monthly closing PDF", "error");
    } finally {
      setExportingPdf(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await saveMonthlyClosing({ month, year, remarks });
      showToast?.(res.data.message, "success");
      setRemarks("");
      loadPreview();
      loadHistory();
      onChanged?.();
    } catch (e) {
      showToast?.(e.response?.data?.message || "Error saving monthly closing", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMonthlyClosing(deleteTarget.id);
      showToast?.("Monthly closing deleted", "success");
      setDeleteTarget(null);
      loadHistory();
    } catch (e) {
      showToast?.("Error deleting monthly closing", "error");
    }
  };

  const summaryLines = (s) => ([
    { label: "Opening Cash in Hand", value: money(s?.openingCash) },
    { label: "Opening Cash in Bank", value: money(s?.openingBank) },
    { label: "Cash Receipts (this month)", value: money(s?.cashReceipts) },
    { label: "Cash Payments (this month)", value: `- ${money(s?.cashPayments)}` },
    { label: "Bank Receipts (this month)", value: money(s?.bankReceipts) },
    { label: "Bank Payments (this month)", value: `- ${money(s?.bankPayments)}` },
    { label: "Cash Withdrawn (Bank→Hand)", value: money(s?.totalWithdrawn) },
    { label: "Bank Deposited (Hand→Bank)", value: money(s?.totalBankDeposited) },
    { label: "Sent to HQ", value: money(s?.totalHoRemittance) },
    { label: "TR Outstanding (Issued)", value: money(s?.trIssued) },
    { label: "Closing Cash in Hand", value: money(s?.closingCash), strong: true },
    { label: "Closing Cash in Bank", value: money(s?.closingBank), strong: true },
    { label: "Closing Total Balance", value: money(s?.closingTotal), strong: true },
  ]);

  const printMonth = (s, remarksText) => {
    const rows = summaryLines(s).map((l) => `
      <tr>
        <td style="${l.strong ? "font-weight:800;" : ""}">${l.label}</td>
        <td style="text-align:right;${l.strong ? "font-weight:800;" : ""}">${l.value}</td>
      </tr>`).join("");

    printDocument({
      title: `Monthly Closing — ${MONTHS[s.month - 1]} ${s.year}`,
      subtitle: "Cash Book",
      bodyHtml: `
        <table><tbody>${rows}</tbody></table>
        ${remarksText ? `<div style="margin-top:16px;"><b>Remarks:</b> ${String(remarksText).replace(/</g, "&lt;")}</div>` : ""}
      `,
    });
  };

  const historyCols = [
    { key: "period", label: "Month", render: (r) => `${MONTHS[r.month - 1]} ${r.year}` },
    { key: "openingCash", label: "Opening Cash", align: "right", render: (r) => money(r.openingCash) },
    { key: "closingCash", label: "Closing Cash", align: "right", render: (r) => money(r.closingCash) },
    { key: "closingBank", label: "Closing Bank", align: "right", render: (r) => money(r.closingBank) },
    { key: "closingTotal", label: "Closing Total", align: "right", render: (r) => money((r.closingCash || 0) + (r.closingBank || 0)) },
    {
      key: "actions", label: "", align: "center",
      render: (r) => (
        <>
          <IconButton size="small" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} sx={{ color: brand.blueDeep, mr: 0.5 }}>
            {expandedId === r.id ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
          </IconButton>
          <IconButton size="small" onClick={() => { try { printMonth(JSON.parse(r.summary), r.remarks); } catch { showToast?.("Could not open this record", "error"); } }} sx={{ color: brand.blueDeep, mr: 0.5 }}>
            <FaPrint size={12} />
          </IconButton>
          <IconButton size="small" onClick={() => setDeleteTarget(r)} sx={{ color: brand.danger }}>
            <FaTrashAlt size={12} />
          </IconButton>
        </>
      ),
    },
  ];
  const exportCols = [
    { key: "period", label: "Month" },
    { key: "openingCash", label: "Opening Cash" },
    { key: "closingCash", label: "Closing Cash" },
    { key: "closingBank", label: "Closing Bank" },
  ];
  const exportRows = history.map((r) => ({
    period: `${MONTHS[r.month - 1]} ${r.year}`,
    openingCash: money(r.openingCash),
    closingCash: money(r.closingCash),
    closingBank: money(r.closingBank),
  }));

  return (
    <>
      <SectionCard
        title="Monthly Closing — Full Month Cash Book Summary"
        action={
          <>
            <Button size="small" variant="outlined" startIcon={<FaFileExcel />}
              disabled={!preview || exporting || exportingPdf}
              sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)", mr: 1 }}
              onClick={exportMonthlyReport}>
              {exporting ? "Building…" : "Monthly Closing Report (Excel)"}
            </Button>
            <Button size="small" variant="outlined" startIcon={<FaFilePdf />}
              disabled={!preview || exporting || exportingPdf}
              sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
              onClick={exportMonthlyReportPdf}>
              {exportingPdf ? "Building…" : "Monthly Closing Report (PDF)"}
            </Button>
          </>
        }
      >
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={4} md={3}>
            <TextField select fullWidth size="small" label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <MenuItem key={m} value={i + 1}>{m}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4} md={2}>
            <TextField fullWidth size="small" type="number" label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </Grid>
        </Grid>

        {loading && <Typography sx={{ color: brand.slate, mb: 2 }}>Loading…</Typography>}

        {!loading && preview && (
          <>
            <Box sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid #E5E9F2", mb: 2 }}>
              {summaryLines(preview).map((l) => (
                <Box key={l.label} sx={{
                  display: "flex", justifyContent: "space-between", gap: 2, px: 2, py: 1.3,
                  background: l.strong ? brand.blueDeep : "#fff",
                  color: l.strong ? "#fff" : brand.ink,
                  borderTop: "1px solid #E5E9F2",
                }}>
                  <Typography fontSize={13} fontWeight={l.strong ? 800 : 600}>{l.label}</Typography>
                  <Typography fontSize={13} fontWeight={800}>{l.value}</Typography>
                </Box>
              ))}
            </Box>

            <Typography sx={{ fontSize: 12.5, color: brand.slate, mb: 2 }}>
              Covers {preview.fromDate} to {preview.toDate}. Saving records this exact snapshot so you can come
              back and view this month's Cash Book any time, even after new entries are added later.
            </Typography>

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={8}>
                <TextField fullWidth size="small" label="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={4} sx={{ display: "flex", gap: 1.5 }}>
                <Button fullWidth variant="contained" disabled={saving} onClick={save}
                  sx={{ height: 40, background: brand.blueDeep, fontWeight: 800, "&:hover": { background: brand.navy } }}>
                  {saving ? "Saving..." : "Save Monthly Closing"}
                </Button>
                <Button variant="outlined" startIcon={<FaPrint />} onClick={() => printMonth(preview, remarks)}
                  sx={{ height: 40, whiteSpace: "nowrap", fontWeight: 800, color: brand.blueDeep, borderColor: brand.blueDeep }}>
                  Print
                </Button>
              </Grid>
            </Grid>
          </>
        )}
      </SectionCard>

      <SectionCard
        title="Monthly Closing History"
        action={
          <>
            <Button size="small" variant="outlined" startIcon={<FaFileExcel />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
              onClick={() => exportExcel("Monthly_Closing_Report", exportCols, exportRows)}>Excel</Button>
          </>
        }
      >
        <DataTable columns={historyCols} rows={history} empty="No monthly closings saved yet" />
        {history.map((r) => (
          <Collapse in={expandedId === r.id} key={r.id} unmountOnExit>
            <Box sx={{ p: 2, borderTop: "1px solid #E5E9F2", background: brand.panel }}>
              <Typography fontWeight={800} sx={{ mb: 1, color: brand.ink }}>
                {MONTHS[r.month - 1]} {r.year} — Saved Snapshot
              </Typography>
              <Box sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid #E5E9F2", background: "#fff" }}>
                {(() => {
                  let s = null;
                  try { s = JSON.parse(r.summary); } catch { s = null; }
                  if (!s) return <Typography sx={{ p: 2, color: brand.slate }}>Snapshot unavailable</Typography>;
                  return summaryLines(s).map((l) => (
                    <Box key={l.label} sx={{
                      display: "flex", justifyContent: "space-between", gap: 2, px: 2, py: 1,
                      borderTop: "1px solid #E5E9F2",
                    }}>
                      <Typography fontSize={12.5} fontWeight={l.strong ? 800 : 600}>{l.label}</Typography>
                      <Typography fontSize={12.5} fontWeight={800}>{l.value}</Typography>
                    </Box>
                  ));
                })()}
              </Box>
              {r.remarks && (
                <Typography sx={{ mt: 1.5, fontSize: 12.5, color: brand.slate }}>
                  <b>Remarks:</b> {r.remarks}
                </Typography>
              )}
            </Box>
          </Collapse>
        ))}
      </SectionCard>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Are you sure?"
        message="Are you sure you want to delete this saved monthly closing?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
