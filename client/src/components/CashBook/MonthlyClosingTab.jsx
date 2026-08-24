import { useEffect, useState } from "react";
import { Box, Button, Grid, MenuItem, TextField, Typography, IconButton, Collapse } from "@mui/material";
import { FaTrashAlt, FaFileExcel, FaFilePdf, FaPrint, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { SectionCard, DataTable, money, signedMoney } from "./ui";
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

// Same status colors as the Daily Closing tab, so the difference badge
// shown here (pulled from that day's saved Daily Closing) matches it.
const STATUS_STYLE = {
  Balanced: { bg: "linear-gradient(135deg,#2FBF71,#1B8A50)", label: "BALANCED" },
  Excess: { bg: "linear-gradient(135deg,#E9B949,#B8860B)", label: "EXCESS CASH" },
  Shortage: { bg: "linear-gradient(135deg,#F0574D,#C0392B)", label: "CASH SHORTAGE" },
};

export default function MonthlyClosingTab({ onChanged, showToast }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [remarks, setRemarks] = useState("");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Physical cash count for the month's last date, pulled from that date's
  // saved Daily Closing — shown on this main page the same way Daily
  // Closing shows its own count, per request.
  const [closingSnapshot, setClosingSnapshot] = useState(null);

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
      loadClosingSnapshot(res.data?.toDate);
    } catch (e) {
      console.log(e);
      showToast?.("Failed to load monthly summary", "error");
    } finally {
      setLoading(false);
    }
  };

  // Same "physical count vs expected" numbers used in the Closing Summary
  // sheet of the Excel/PDF export, but loaded up-front so they can also be
  // shown directly on this page, matching how Daily Closing shows its count.
  const loadClosingSnapshot = async (toDate) => {
    if (!toDate) { setClosingSnapshot(null); return; }
    try {
      const [closingSummaryRes, bankInfoRes, savedClosingsRes] = await Promise.all([
        getClosingSummary(toDate),
        getCashSummary(toDate),
        getClosings({ from: toDate, to: toDate }),
      ]);
      const cs = closingSummaryRes.data || {};
      const bankInfo = bankInfoRes.data || {};
      const savedClosing = (savedClosingsRes.data || [])
        .filter((r) => String(r.closingDate).slice(0, 10) === toDate)
        .sort((a, b) => b.id - a.id)[0] || null;

      const expected = round2(cs.expectedCash);
      const trAmt = round2(cs.trIssued);
      const cashInBank = round2(bankInfo.cashInBank);
      const cashInHandGross = round2(expected + trAmt);
      const grandTotal = round2(bankInfo.totalBalance ?? cashInHandGross + cashInBank);

      let counts = {};
      let actualCash = null;
      let difference = null;
      let status = null;
      if (savedClosing) {
        try { counts = JSON.parse(savedClosing.denominations || "{}"); } catch { counts = {}; }
        actualCash = round2(savedClosing.actualCash);
        difference = round2(savedClosing.difference);
        status = difference === 0 ? "Balanced" : difference > 0 ? "Excess" : "Shortage";
      }

      setClosingSnapshot({
        toDate, counts, actualCash, difference, status,
        expected, trAmt, cashInHandGross, cashInBank, grandTotal,
        hasSavedClosing: !!savedClosing,
      });
    } catch (e) {
      console.log(e);
      setClosingSnapshot(null);
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
      // Build the same 4-sheet snapshot used by the Excel/PDF export and
      // save it along with the totals, so this exact month can be reopened
      // later from History showing all 4 sheets, not just a single summary.
      let sheets = null;
      try {
        const built = await buildMonthlyReportSheets();
        sheets = built?.sheets || null;
      } catch (e) {
        console.log(e);
      }
      const res = await saveMonthlyClosing({ month, year, remarks, sheets });
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
            <Button size="small" variant="contained" startIcon={<FaFileExcel />}
              disabled={!preview || exporting || exportingPdf}
              sx={{ background: brand.success, color: "#fff", mr: 1, "&:hover": { background: "#166B44" } }}
              onClick={exportMonthlyReport}>
              {exporting ? "Building…" : "Monthly Closing Report (Excel)"}
            </Button>
            <Button size="small" variant="contained" startIcon={<FaFilePdf />}
              disabled={!preview || exporting || exportingPdf}
              sx={{ background: brand.danger, color: "#fff", "&:hover": { background: "#9E2E22" } }}
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
          <Grid container spacing={4}>
            {/* Physical cash count — same shape as Daily Closing's own count,
                pulled from the Daily Closing saved on the month's last date */}
            <Grid item xs={12} md={7} sx={{ pr: { md: 2 } }}>
              <Box sx={{
                mb: 2, p: 1.8, borderRadius: 3, border: `1.5px solid ${brand.gold}`,
                background: "rgba(212,175,55,0.06)",
              }}>
                <Typography fontWeight={800} sx={{ mb: 1.5, color: brand.ink }}>
                  Physical Cash Count — as of {preview.toDate}
                </Typography>
                <Box sx={{ borderRadius: 2.5, overflow: "hidden", border: "1px solid #E5E9F2" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                    <thead>
                      <tr>
                        {["Denomination", "Qty", "Amount"].map((h, i) => (
                          <th key={h} style={{
                            background: brand.panel, color: brand.ink,
                            textAlign: i === 0 ? "left" : i === 1 ? "center" : "right",
                            padding: "9px 12px", fontWeight: 800, borderBottom: `2px solid ${brand.gold}`,
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DENOMS.map((d, i) => {
                        const qty = Number(closingSnapshot?.counts?.[d]) || 0;
                        return (
                          <tr key={d} style={{ background: qty ? "rgba(212,175,55,0.08)" : i % 2 ? "rgba(238,243,251,0.5)" : "#fff" }}>
                            <td style={{ padding: "8px 12px", borderBottom: "1px solid #E5E9F2", fontWeight: 800, color: brand.blueDeep }}>
                              Rs. {d.toLocaleString()}
                            </td>
                            <td style={{ padding: "8px 12px", borderBottom: "1px solid #E5E9F2", textAlign: "center" }}>
                              {qty || ""}
                            </td>
                            <td style={{ padding: "8px 12px", borderBottom: "1px solid #E5E9F2", textAlign: "right", fontWeight: 800, color: brand.ink }}>
                              {money(d * qty)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </Box>

                <Box sx={{
                  mt: 2, p: 2, borderRadius: 3, background: brand.panel, border: "1px solid rgba(15,76,129,0.14)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <Typography fontWeight={800} color={brand.ink}>Actual Cash Counted</Typography>
                  <Typography variant="h6" fontWeight={900} color={brand.blueDeep}>
                    {closingSnapshot?.hasSavedClosing ? money(closingSnapshot.actualCash) : "—"}
                  </Typography>
                </Box>

                {closingSnapshot && !closingSnapshot.hasSavedClosing && (
                  <Typography sx={{ mt: 1.5, fontSize: 12, color: brand.slate }}>
                    No Daily Closing saved on {preview.toDate} yet — physical count not available.
                  </Typography>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} md={5} sx={{ pl: { md: 3 }, borderLeft: { md: "1px solid #E5E9F2" } }}>
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

              {closingSnapshot?.hasSavedClosing && closingSnapshot.status && (
                <Box sx={{
                  mb: 2, p: 2.5, borderRadius: 3, background: STATUS_STYLE[closingSnapshot.status].bg,
                  color: "#fff", textAlign: "center", border: "2px solid rgba(255,255,255,0.3)",
                }}>
                  <Typography fontSize={12.5} fontWeight={700} sx={{ opacity: 0.9 }}>Cash Difference</Typography>
                  <Typography variant="h5" fontWeight={900}>{signedMoney(closingSnapshot.difference)}</Typography>
                  <Typography fontSize={13} fontWeight={800} letterSpacing={1}>{STATUS_STYLE[closingSnapshot.status].label}</Typography>
                </Box>
              )}

              <Typography sx={{ fontSize: 12.5, color: brand.slate, mb: 2 }}>
                Covers {preview.fromDate} to {preview.toDate}. Saving records this exact snapshot (including
                the 4-sheet Receipt Side / Payment Side / Outstanding TRs / Closing Summary breakdown) so you
                can come back and view this month's Cash Book any time, even after new entries are added later.
              </Typography>

              <TextField fullWidth size="small" label="Remarks" sx={{ mb: 2 }} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              <Button fullWidth variant="contained" disabled={saving} onClick={save}
                sx={{ height: 42, background: brand.blueDeep, fontWeight: 800, "&:hover": { background: brand.navy } }}>
                {saving ? "Saving..." : "Save Monthly Closing"}
              </Button>
            </Grid>
          </Grid>
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
              <Typography fontWeight={800} sx={{ mb: 1.5, color: brand.ink }}>
                {MONTHS[r.month - 1]} {r.year} — Saved Snapshot
              </Typography>
              {(() => {
                let sheets = null;
                try { sheets = r.sheets ? JSON.parse(r.sheets) : null; } catch { sheets = null; }

                if (sheets && sheets.length) {
                  // Permanent 4-sheet record, exactly as it was at save time.
                  return sheets.map((sheet) => (
                    <Box key={sheet.name} sx={{ mb: 2 }}>
                      <Box sx={{
                        px: 1.5, py: 0.8, borderRadius: "8px 8px 0 0", background: brand.blueDeep,
                      }}>
                        <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: 12.5 }}>{sheet.name}</Typography>
                      </Box>
                      <Box sx={{ borderRadius: "0 0 8px 8px", overflow: "hidden", border: "1px solid #E5E9F2", background: "#fff" }}>
                        <DataTable
                          columns={sheet.columns.map((c) => ({ key: c.key, label: c.label, align: c.key === "amount" || c.key === "cash" || c.key === "bank" || c.key === "qty" ? "right" : undefined }))}
                          rows={sheet.rows}
                          empty="No records"
                        />
                      </Box>
                    </Box>
                  ));
                }

                // Older records saved before the 4-sheet snapshot existed —
                // fall back to the flat totals that were stored for them.
                let s = null;
                try { s = JSON.parse(r.summary); } catch { s = null; }
                if (!s) return <Typography sx={{ p: 2, color: brand.slate }}>Snapshot unavailable</Typography>;
                return (
                  <Box sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid #E5E9F2", background: "#fff" }}>
                    {summaryLines(s).map((l) => (
                      <Box key={l.label} sx={{
                        display: "flex", justifyContent: "space-between", gap: 2, px: 2, py: 1,
                        borderTop: "1px solid #E5E9F2",
                      }}>
                        <Typography fontSize={12.5} fontWeight={l.strong ? 800 : 600}>{l.label}</Typography>
                        <Typography fontSize={12.5} fontWeight={800}>{l.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                );
              })()}
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
