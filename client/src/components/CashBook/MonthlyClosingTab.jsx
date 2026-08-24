import { useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, MenuItem, TextField, Typography, IconButton, Collapse } from "@mui/material";
import { FaTrashAlt, FaFileExcel, FaFilePdf, FaChevronDown, FaChevronUp, FaPrint } from "react-icons/fa";
import { SectionCard, DataTable, money, signedMoney } from "./ui";
import {
  getMonthlySummary,
  getMonthlyClosings,
  saveMonthlyClosing,
  deleteMonthlyClosing,
  getReceipts,
  getPayments,
  getTRs,
} from "../../api/cashbookApi";
import { exportXlsxMultiSheet } from "../../utils/xlsxWriter";
import { downloadMultiSectionPdf } from "../../utils/multiSectionPdf";
import { printDocument, tableHtml } from "../../utils/print";
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

const closingCols = [
  { key: "particulars", label: "Particulars", width: 30 },
  { key: "qty", label: "Qty", width: 10 },
  { key: "amount", label: "Amount", width: 16 },
];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Same denomination list as the Daily Closing tab, so the physical cash
// count block here matches it note-for-note.
const NOTES = [5000, 1000, 500, 100, 50, 20, 10];
const COINS = [5, 2, 1];
const DENOMS = [...NOTES, ...COINS];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Same status colors as the Daily Closing tab, so the difference badge
// shown here matches it.
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

  // Physical cash count for the month — entered directly here, the same
  // way Daily Closing counts its drawer. Actual Cash Counted below adds
  // itself up as the quantities are typed in.
  const [counts, setCounts] = useState({});

  const [history, setHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingRowId, setExportingRowId] = useState(null);

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

  useEffect(() => { loadPreview(); setCounts({}); /* eslint-disable-next-line */ }, [month, year]);
  useEffect(() => { loadHistory(); }, []);

  const actualCash = useMemo(
    () => DENOMS.reduce((t, d) => t + d * (Number(counts[d]) || 0), 0),
    [counts]
  );

  // Expected Cash In Hand for the month, straight from the monthly summary
  // (Receipt Side cash - Payment Side cash - outstanding TR, as of the
  // month's last date) — no extra lookups needed.
  const expected = round2(preview?.closingCash);
  const cashInBank = round2(preview?.closingBank);
  const grandTotal = round2(preview?.closingTotal);
  // Outstanding TR = whatever's left once cash-in-hand and cash-in-bank are
  // taken out of the month-end total.
  const trAmt = round2(grandTotal - expected - cashInBank);
  const cashInHandGross = round2(expected + trAmt);

  // Difference = Cash Counted - Expected Cash (0 = Balanced, +ve = Excess, -ve = Shortage)
  const difference = round2(actualCash - expected);
  const status = difference === 0 ? "Balanced" : difference > 0 ? "Excess" : "Shortage";
  const style = STATUS_STYLE[status];

  // Builds the same 4-sheet pattern as Daily Closing (Receipt Side / Payment
  // Side / Outstanding TRs / Cash Counting), scoped to the selected month,
  // using the physical cash count currently on screen. Used by both the
  // Excel and PDF exports below, and saved with the record itself so a
  // saved month can always be reopened exactly as it was.
  const buildMonthlyReportSheets = async () => {
    if (!preview) return null;
    const { fromDate, toDate } = preview;
    const num = (v) => Number(v || 0);

    const [receiptsRes, paymentsRes, trsRes] = await Promise.all([
      getReceipts({ from: fromDate, to: toDate }),
      getPayments({ from: fromDate, to: toDate }),
      getTRs({ to: toDate, status: "Not Cleared" }),
    ]);

    const receiptRows = (receiptsRes.data || []).map((r) => ({ ...r, cash: num(r.cash), bank: num(r.bank) }));
    const paymentRows = (paymentsRes.data || []).map((r) => ({ ...r, cash: num(r.cash), bank: num(r.bank) }));
    const trRows = (trsRes.data || []).map((r) => ({ ...r, amount: num(r.amount) }));

    const receiptTotalRow = { date: "", voucherNo: "", party: "", description: "", head: "", farm: "", sourceTag: "TOTAL", cash: round2(receiptRows.reduce((t, r) => t + r.cash, 0)), bank: round2(receiptRows.reduce((t, r) => t + r.bank, 0)), __bold: true };
    const paymentTotalRow = { date: "", voucherNo: "", party: "", description: "", head: "", farm: "", sourceTag: "TOTAL", cash: round2(paymentRows.reduce((t, r) => t + r.cash, 0)), bank: round2(paymentRows.reduce((t, r) => t + r.bank, 0)), __bold: true };
    const trTotalRow = { entryDate: "", description: "", issuedTo: "", amount: round2(trRows.reduce((t, r) => t + r.amount, 0)), authority: "", status: "TOTAL OUTSTANDING", __bold: true };

    const denomRows = DENOMS.map((d) => {
      const qty = Number(counts[d]) || 0;
      return { particulars: `Rs. ${d.toLocaleString()}`, qty, amount: round2(d * qty) };
    });

    const closingRows = [
      { particulars: "CASH IN HAND — PHYSICAL COUNT", qty: "", amount: "", __bold: true },
      ...denomRows,
      { particulars: "Total", qty: "", amount: actualCash, __bold: true },
      { particulars: "Differ", qty: "", amount: difference, __bold: true },
      { particulars: "", qty: "", amount: "" },
      { particulars: "Cash", qty: "", amount: expected, __bold: true },
      { particulars: "TR", qty: "", amount: trAmt, __bold: true },
      { particulars: "Cash In Hand", qty: "", amount: cashInHandGross, __bold: true },
      { particulars: "", qty: "", amount: "" },
      { particulars: "Cash In Bank", qty: "", amount: cashInBank, __bold: true },
      { particulars: "", qty: "", amount: "" },
      { particulars: "TOTAL", qty: "", amount: grandTotal, __bold: true },
      ...(remarks ? [{ particulars: "", qty: "", amount: "" }, { particulars: `Remarks: ${remarks}`, qty: "", amount: "" }] : []),
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
          name: "Cash Counting",
          title: `Monthly Closing — ${MONTHS[month - 1]} ${year}`,
          subtitle: `Cash Counting as of ${toDate}`,
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
      // Build the same 4-sheet snapshot used by the Excel/PDF export above
      // and save it along with the record, so this exact month — including
      // today's physical cash count — can be reopened later from History
      // as Excel or PDF, showing the same 4 sheets, even after new entries
      // are added afterwards.
      let sheets = null;
      try {
        const built = await buildMonthlyReportSheets();
        sheets = built?.sheets || null;
      } catch (e) {
        console.log(e);
      }
      const res = await saveMonthlyClosing({ month, year, remarks, sheets });
      showToast?.(res.data.message, status === "Balanced" ? "success" : "warning");
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

  // Re-opens a saved month's own 4-sheet snapshot (Receipt Side / Payment
  // Side / Outstanding TRs / Cash Counting), exactly as it was at save
  // time — no recalculation, so it always matches what was saved.
  const savedSheetsOf = (r) => {
    try {
      const sheets = r.sheets ? JSON.parse(r.sheets) : null;
      return sheets && sheets.length ? sheets : null;
    } catch {
      return null;
    }
  };

  const exportSavedExcel = async (r) => {
    const sheets = savedSheetsOf(r);
    if (!sheets) { showToast?.("No saved report available for this record", "error"); return; }
    setExportingRowId(`${r.id}-xlsx`);
    try {
      await exportXlsxMultiSheet({ filename: `Monthly_Closing_Report_${MONTHS[r.month - 1]}_${r.year}`, sheets });
      showToast?.("Monthly closing report downloaded", "success");
    } catch (e) {
      console.log(e);
      showToast?.("Failed to build monthly closing report", "error");
    } finally {
      setExportingRowId(null);
    }
  };

  const exportSavedPdf = async (r) => {
    const sheets = savedSheetsOf(r);
    if (!sheets) { showToast?.("No saved report available for this record", "error"); return; }
    setExportingRowId(`${r.id}-pdf`);
    try {
      downloadMultiSectionPdf({
        filename: `Monthly_Closing_Report_${MONTHS[r.month - 1]}_${r.year}`,
        docTitle: `Monthly Closing Report — ${MONTHS[r.month - 1]} ${r.year}`,
        sections: sheets.map((s) => ({ title: s.title, subtitle: s.subtitle, columns: s.columns, rows: s.rows })),
      });
      showToast?.("Monthly closing PDF downloaded", "success");
    } catch (e) {
      console.log(e);
      showToast?.("Failed to build monthly closing PDF", "error");
    } finally {
      setExportingRowId(null);
    }
  };

  // Standalone print for just the physical cash count — built to match the
  // office's own "Cash In Hand" sheet layout: denomination table, then
  // Total / Differ, then the Cash / TR / Cash In Hand / Cash In Bank / TOTAL
  // breakdown, all stacked in one column below the table (not a separate
  // side panel) — with the same highlight colors that sheet uses.
  const printCashCounting = () => {
    if (!preview) return;
    const rows = DENOMS.map((d) => {
      const qty = Number(counts[d]) || 0;
      return { denomination: `Rs. ${d.toLocaleString()}`, qty, amount: money(d * qty) };
    });
    const cols = [
      { key: "denomination", label: "Denomination" },
      { key: "qty", label: "Qty" },
      { key: "amount", label: "Amount" },
    ];

    const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const summaryRow = (label, value, opts = {}) => `
      <tr>
        <td colspan="2" style="padding:6px 9px;border:1px solid #C9D3E3;font-weight:${opts.bold === false ? 600 : 800};background:${opts.bg || "rgba(255,255,255,0.92)"};color:${opts.color || "#0B1B33"};font-size:10.5pt;">${esc(label)}</td>
        <td style="padding:6px 9px;border:1px solid #C9D3E3;text-align:right;font-weight:${opts.bold === false ? 600 : 800};background:${opts.bg || "rgba(255,255,255,0.92)"};color:${opts.color || "#0B1B33"};font-size:10.5pt;">${esc(value)}</td>
      </tr>`;
    const spacer = `<tr><td colspan="3" style="border:none;background:transparent;height:7px;padding:0;"></td></tr>`;

    const summaryHtml = `
      <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
        <tbody>
          ${summaryRow("Total", money(actualCash))}
          ${summaryRow("Differ", signedMoney(difference), { bg: brand.danger, color: "#fff" })}
          ${spacer}
          ${summaryRow("Cash", money(expected), { bold: false })}
          ${summaryRow("TR", money(trAmt), { bold: false })}
          ${summaryRow("Cash In Hand", money(cashInHandGross))}
          ${spacer}
          ${summaryRow("Cash In Bank", money(cashInBank), { bg: "#2FBF71", color: "#0a3319" })}
          ${spacer}
          ${summaryRow("TOTAL", money(grandTotal), { bg: brand.blueDeep, color: "#fff" })}
          ${remarks ? spacer + summaryRow("Remarks", remarks, { bold: false }) : ""}
        </tbody>
      </table>`;

    const bodyHtml = `
      <div class="info-box">
        <div class="info-grid">
          <div class="info-item"><div>
            <div class="info-label">MONTH</div>
            <div class="info-value">${MONTHS[month - 1]} ${year}</div>
          </div></div>
          <div class="info-item"><div>
            <div class="info-label">ACTUAL CASH COUNTED</div>
            <div class="info-value">${money(actualCash)}</div>
          </div></div>
        </div>
      </div>
      <div style="display:flex;gap:16px;align-items:flex-start;margin-top:6px;">
        <div style="flex:1 1 58%;min-width:0;">${tableHtml(cols, rows)}</div>
        <div style="flex:1 1 42%;min-width:0;">${summaryHtml}</div>
      </div>
    `;
    printDocument({
      title: "Cash Counting Slip",
      subtitle: `Monthly Closing — ${MONTHS[month - 1]} ${year} (as of ${preview.toDate})`,
      bodyHtml,
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
          <IconButton size="small" disabled={exportingRowId === `${r.id}-xlsx`} onClick={() => exportSavedExcel(r)} sx={{ color: brand.success, mr: 0.5 }}>
            <FaFileExcel size={12} />
          </IconButton>
          <IconButton size="small" disabled={exportingRowId === `${r.id}-pdf`} onClick={() => exportSavedPdf(r)} sx={{ color: brand.danger, mr: 0.5 }}>
            <FaFilePdf size={12} />
          </IconButton>
          <IconButton size="small" onClick={() => setDeleteTarget(r)} sx={{ color: brand.danger }}>
            <FaTrashAlt size={12} />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <>
      <SectionCard
        title="Monthly Closing — Physical Cash Verification"
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
            {/* Cash counting comes first — count the drawer before checking it against the expected total */}
            <Grid item xs={12} md={7} sx={{ pr: { md: 2 }, flex: { xs: "1 1 100%", md: "0 0 58%" }, maxWidth: { xs: "100%", md: "58%" } }}>
              <Box sx={{
                mb: 2, p: 1.8, borderRadius: 3, border: `1.5px solid ${brand.gold}`,
                background: "rgba(212,175,55,0.06)",
              }}>
                <Typography fontWeight={800} sx={{ mb: 1.5, color: "#fff" }}>
                  Count Physical Cash — as of {preview.toDate}
                </Typography>
                <Box sx={{ borderRadius: 2.5, overflow: "hidden", border: "1px solid #E5E9F2" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
                    <thead>
                      <tr>
                        {["Denomination", "Qty", "Amount"].map((h, i) => (
                          <th key={h} style={{
                            background: brand.tableCardBg, color: brand.tableCardHeaderText,
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
                        const qty = Number(counts[d]) || 0;
                        return (
                          <tr key={d} style={{ background: qty ? "rgba(244,197,66,0.35)" : i % 2 ? brand.rowWhiteGradient : brand.rowBlue }}>
                            <td style={{ padding: "8px 12px", borderBottom: "1px solid #E5E9F2", fontWeight: 800, color: brand.blueDeep }}>
                              Rs. {d.toLocaleString()}
                            </td>
                            <td style={{ padding: "6px 12px", borderBottom: "1px solid #E5E9F2", textAlign: "center" }}>
                              <TextField
                                size="small" type="number" placeholder="Qty" value={counts[d] ?? ""}
                                onChange={(e) => setCounts({ ...counts, [d]: e.target.value })}
                                sx={{ width: 100 }}
                              />
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
                  mt: 2, p: 2, borderRadius: 3, background: brand.tableCardBg, border: `1px solid ${brand.tableCardBorder}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <Typography fontWeight={800} color="#fff">Actual Cash Counted</Typography>
                  <Typography variant="h6" fontWeight={900} color={brand.goldLight}>{money(actualCash)}</Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={5} sx={{ pl: { md: 3 }, borderLeft: { md: "1px solid #E5E9F2" }, flex: { xs: "1 1 100%", md: "0 0 42%" }, maxWidth: { xs: "100%", md: "42%" } }}>
              <Box sx={{
                p: 2, borderRadius: 3, border: `1.5px solid rgba(15,76,129,0.2)`,
                background: "#dfebfa", mt: { xs: 4, md: 0 }, mb: 2,
              }}>
                <Typography fontWeight={800} sx={{ mb: 1.5, color: brand.ink, fontSize: 15 }}>
                  Closing Summary
                </Typography>

                <Box sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid #E5E9F2" }}>
                  {[
                    { label: "Receipt Side — Cash Column Total (month)", value: money(preview.cashReceipts) },
                    { label: "Less: Payment Side — Cash Column Total (month)", value: `- ${money(preview.cashPayments)}` },
                    { label: "Less: Outstanding TR (as of month end)", value: `- ${money(trAmt)}` },
                    { label: "Expected Cash Balance", value: money(expected), strong: true },
                  ].map((l) => (
                    <Box key={l.label} sx={{
                      display: "flex", justifyContent: "space-between", gap: 2, px: 2, py: 1.3,
                      background: l.strong ? brand.blueDeep : brand.rowBlue,
                      color: l.strong ? "#fff" : brand.rowText,
                      borderTop: "1px solid #E5E9F2",
                    }}>
                      <Typography fontSize={13} fontWeight={l.strong ? 800 : 600}>{l.label}</Typography>
                      <Typography fontSize={13} fontWeight={800}>{l.value}</Typography>
                    </Box>
                  ))}
                </Box>

                <Box sx={{
                  mt: 2, p: 2.5, borderRadius: 3, background: style.bg, color: "#fff", textAlign: "center",
                  border: "2px solid rgba(255,255,255,0.3)",
                }}>
                  <Typography fontSize={12.5} fontWeight={700} sx={{ opacity: 0.9 }}>Cash Difference</Typography>
                  <Typography variant="h4" fontWeight={900}>
                    {signedMoney(difference)}
                  </Typography>
                  <Typography fontSize={13} fontWeight={800} letterSpacing={1}>{style.label}</Typography>
                  <Typography fontSize={12} sx={{ mt: 0.5, opacity: 0.92 }}>
                    Actual {money(actualCash)} vs Expected {money(expected)}
                  </Typography>
                </Box>

                <Typography sx={{ mt: 2, fontSize: 12, color: brand.slate }}>
                  Covers {preview.fromDate} to {preview.toDate}. Saving records this exact snapshot (including
                  the physical cash count above, and the 4-sheet Receipt Side / Payment Side / Outstanding TRs /
                  Cash Counting breakdown) so you can come back and view this month's Cash Book any time, even
                  after new entries are added later.
                </Typography>

                <TextField fullWidth size="small" label="Remarks" sx={{ mt: 2 }} value={remarks}
                  onChange={(e) => setRemarks(e.target.value)} />
                <Button fullWidth variant="contained" disabled={saving} onClick={save}
                  sx={{ height: 42, mt: 2, background: brand.blueDeep, fontWeight: 800, "&:hover": { background: brand.navy } }}>
                  {saving ? "Saving..." : "Save Monthly Closing"}
                </Button>
                <Button fullWidth variant="outlined" startIcon={<FaPrint size={12} />}
                  onClick={printCashCounting}
                  sx={{ mt: 1.5, height: 40, borderColor: brand.gold, color: brand.goldDark, fontWeight: 700,
                    "&:hover": { borderColor: brand.goldDark, background: "rgba(212,175,55,0.08)" } }}>
                  Print Cash Counting
                </Button>
              </Box>
            </Grid>
          </Grid>
        )}
      </SectionCard>

      <SectionCard title="Monthly Closing History">
        <DataTable columns={historyCols} rows={history} empty="No monthly closings saved yet" />
        {history.map((r) => (
          <Collapse in={expandedId === r.id} key={r.id} unmountOnExit>
            <Box sx={{ p: 2, borderTop: "1px solid #E5E9F2", background: brand.tableCardBg }}>
              <Typography fontWeight={800} sx={{ mb: 1.5, color: brand.ink }}>
                {MONTHS[r.month - 1]} {r.year} — Saved Snapshot
              </Typography>
              {(() => {
                const sheets = savedSheetsOf(r);
                if (sheets) {
                  // Permanent 4-sheet record, exactly as it was at save time.
                  return sheets.map((sheet) => (
                    <Box key={sheet.name} sx={{ mb: 2 }}>
                      <Box sx={{
                        px: 1.5, py: 0.8, borderRadius: "8px 8px 0 0", background: brand.blueDeep,
                      }}>
                        <Typography sx={{ color: "#fff", fontWeight: 800, fontSize: 12.5 }}>{sheet.name}</Typography>
                      </Box>
                      <Box sx={{ borderRadius: "0 0 8px 8px", overflow: "hidden", border: "1px solid #E5E9F2", background: "#dfebfa" }}>
                        <DataTable
                          columns={sheet.columns.map((c) => ({ key: c.key, label: c.label, align: c.key === "amount" || c.key === "cash" || c.key === "bank" || c.key === "qty" ? "right" : undefined }))}
                          rows={sheet.rows}
                          empty="No records"
                        />
                      </Box>
                    </Box>
                  ));
                }
                return <Typography sx={{ p: 2, color: brand.slate }}>Snapshot unavailable</Typography>;
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
