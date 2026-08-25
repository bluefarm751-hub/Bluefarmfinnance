import { useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, TextField, Typography, IconButton } from "@mui/material";
import { FaTrashAlt, FaFileExcel, FaFilePdf, FaPrint } from "react-icons/fa";
import { SectionCard, DataTable, money, signedMoney, today } from "./ui";
import {
  getClosingSummary, getClosings, saveClosing, deleteClosing, getCashSummary,
  getReceipts, getPayments, getTRs,
} from "../../api/cashbookApi";
import { exportExcel } from "../../utils/exportExcel";
import { exportXlsxMultiSheet } from "../../utils/xlsxWriter";
import { downloadMultiSectionPdf } from "../../utils/multiSectionPdf";
import { printDocument, tableHtml } from "../../utils/print";
import { brand } from "../../theme";
import DateFieldDMY from "../DateFieldDMY";
import ConfirmDialog from "../ConfirmDialog";

const NOTES = [5000, 1000, 500, 100, 50, 20, 10];
const COINS = [5, 2, 1];
const DENOMS = [...NOTES, ...COINS];

// Same columns used across the Receipt / Payment side reports elsewhere in
// the app (Monthly Closing report, etc.), so the daily workbook's sheets
// match what those already show.
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

const STATUS_STYLE = {
  Balanced: { bg: "linear-gradient(135deg,#2FBF71,#1B8A50)", label: "BALANCED" },
  Excess: { bg: "linear-gradient(135deg,#E9B949,#B8860B)", label: "EXCESS CASH" },
  Shortage: { bg: "linear-gradient(135deg,#F0574D,#C0392B)", label: "CASH SHORTAGE" },
};

// ISO (yyyy-mm-dd) -> dd-mm-yyyy, for the printed slip title
function formatDMY(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return String(iso);
  return `${d}-${m}-${y}`;
}

export default function DailyClosingTab({ onChanged, showToast }) {
  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState(null);
  const [bankInfo, setBankInfo] = useState(null);
  const [counts, setCounts] = useState({});
  const [remarks, setRemarks] = useState("");
  const [history, setHistory] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exportingReport, setExportingReport] = useState(false);
  const [exportingReportPdf, setExportingReportPdf] = useState(false);

  const load = async () => {
    try {
      const [s, h, b] = await Promise.all([getClosingSummary(date), getClosings(), getCashSummary(date)]);
      setSummary(s.data);
      setHistory(h.data || []);
      setBankInfo(b.data);
    } catch (e) { console.log(e); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [date]);

  const actualCash = useMemo(
    () => DENOMS.reduce((t, d) => t + d * (Number(counts[d]) || 0), 0),
    [counts]
  );

  // Expected Cash = Receipt Side Cash Total - Payment Side Cash Total - TR (Outstanding)
  // Cash Withdrawal / Bank Deposit are Contra entries, so they're already
  // included inside Receipt Side Cash / Payment Side Cash — not added again here.
  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const expected = round2(summary?.expectedCash);
  // Difference = Cash Counted - Expected Cash  (0 = Same/Balanced, +ve = Surplus, -ve = Shortage)
  const difference = round2(actualCash - expected);
  const status = difference === 0 ? "Balanced" : difference > 0 ? "Excess" : "Shortage";
  const style = STATUS_STYLE[status];

  const save = async () => {
    try {
      const res = await saveClosing({ closingDate: date, actualCash, denominations: counts, remarks });
      showToast(res.data.message, status === "Balanced" ? "success" : "warning");
      load();
      onChanged?.();
    } catch (e) {
      showToast(e.response?.data?.message || "Error saving closing", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteClosing(deleteTarget.id);
      showToast("Closing deleted successfully", "success");
      setDeleteTarget(null);
      load();
    } catch (e) { showToast("Error deleting closing", "error"); }
  };

  // "Cash" (books) + outstanding TR = gross Cash In Hand, then + Cash In Bank = Total —
  // same pattern as the office's printed Daily Closing sheet.
  const trAmt = round2(summary?.trIssued);
  const cashInBank = round2(bankInfo?.cashInBank);
  const cashInHandGross = round2(expected + trAmt);
  const grandTotal = round2(bankInfo?.totalBalance ?? cashInHandGross + cashInBank);


  // Builds the same 4-section "Daily Closing Main Report" pattern used by
  // Monthly Closing (Receipt Side / Payment Side / Outstanding TRs / Closing
  // Summary), scoped to just the selected closing date, using the physical
  // cash count currently on screen (not necessarily saved yet) so the report
  // always matches what's shown above.
  const buildDailyReportSheets = () => {
    const num = (v) => Number(v || 0);
    return (async () => {
      const [receiptsRes, paymentsRes, trsRes] = await Promise.all([
        getReceipts({ from: date, to: date }),
        getPayments({ from: date, to: date }),
        getTRs({ to: date, status: "Not Cleared" }),
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
        sheets: [
          {
            name: "Receipt Side",
            title: `Receipt Side — ${formatDMY(date)}`,
            subtitle: date,
            columns: sideCols,
            rows: [...receiptRows, receiptTotalRow],
          },
          {
            name: "Payment Side",
            title: `Payment Side — ${formatDMY(date)}`,
            subtitle: date,
            columns: sideCols,
            rows: [...paymentRows, paymentTotalRow],
          },
          {
            name: "Outstanding TRs",
            title: `Outstanding TRs — as of ${formatDMY(date)}`,
            subtitle: "Daily Closing",
            columns: trCols,
            rows: [...trRows, trTotalRow],
          },
          {
            name: "Closing Summary",
            title: `Daily Closing — ${formatDMY(date)}`,
            subtitle: "Cash Book Closing",
            columns: closingCols,
            rows: closingRows,
          },
        ],
      };
    })();
  };

  const exportDailyReport = async () => {
    setExportingReport(true);
    try {
      const data = await buildDailyReportSheets();
      await exportXlsxMultiSheet({
        filename: `Daily_Closing_Report_${date}`,
        sheets: data.sheets,
      });
      showToast("Daily closing report downloaded", "success");
    } catch (e) {
      console.log(e);
      showToast("Failed to build daily closing report", "error");
    } finally {
      setExportingReport(false);
    }
  };

  const exportDailyReportPdf = async () => {
    setExportingReportPdf(true);
    try {
      const data = await buildDailyReportSheets();
      downloadMultiSectionPdf({
        filename: `Daily_Closing_Report_${date}`,
        docTitle: `Daily Closing Report — ${formatDMY(date)}`,
        sections: data.sheets.map((s) => ({ title: s.title, subtitle: s.subtitle, columns: s.columns, rows: s.rows })),
      });
      showToast("Daily closing PDF downloaded", "success");
    } catch (e) {
      console.log(e);
      showToast("Failed to build daily closing PDF", "error");
    } finally {
      setExportingReportPdf(false);
    }
  };

  // Standalone print for just the physical cash count — built to match the
  // office's own "Cash In Hand" sheet layout: denomination table, then
  // Total / Differ, then the Cash / TR / Cash In Hand / Cash In Bank / TOTAL
  // breakdown, all stacked in one column below the table (not a separate
  // side panel) — with the same highlight colors that sheet uses.
  const printCashCounting = () => {
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
        <td colspan="2" style="padding:6px 10px;border:1px solid #C9D3E3;font-weight:${opts.bold === false ? 600 : 800};background:${opts.bg || "rgba(255,255,255,0.92)"};color:${opts.color || "#0B1B33"};">${esc(label)}</td>
        <td style="padding:6px 10px;border:1px solid #C9D3E3;text-align:right;font-weight:${opts.bold === false ? 600 : 800};background:${opts.bg || "rgba(255,255,255,0.92)"};color:${opts.color || "#0B1B33"};">${esc(value)}</td>
      </tr>`;
    const spacer = `<tr><td colspan="3" style="border:none;background:transparent;height:6px;padding:0;"></td></tr>`;

    const summaryHtml = `
      <table style="width:100%;border-collapse:collapse;font-size:10pt;font-family:Arial,sans-serif;margin-top:0;">
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
            <div class="info-label">CLOSING DATE</div>
            <div class="info-value">${formatDMY(date)}</div>
          </div></div>
          <div class="info-item"><div>
            <div class="info-label">ACTUAL CASH COUNTED</div>
            <div class="info-value">${money(actualCash)}</div>
          </div></div>
        </div>
      </div>
      <div style="margin-bottom:14px;">${tableHtml(cols, rows)}</div>
      <div>${summaryHtml}</div>
    `;
    printDocument({
      title: "Cash Counting Slip",
      subtitle: `Daily Closing — ${formatDMY(date)}`,
      bodyHtml,
    });
  };

  const lines = [
    { label: "Receipt Side — Cash Column Total", value: money(summary?.cashReceipts) },
    { label: "Less: Payment Side — Cash Column Total", value: `- ${money(summary?.cashBills)}` },
    { label: "Less: Temporary Receipts (TR Payment, Uncleared)", value: `- ${money(summary?.trIssued)}` },
    { label: "Expected Cash Balance", value: money(expected), strong: true },
  ];

  const historyCols = [
    { key: "closingDate", label: "Date" },
    { key: "totalWithdrawn", label: "Withdrawn", align: "right", render: (r) => money(r.totalWithdrawn) },
    { key: "cashBills", label: "Cash Bills", align: "right", render: (r) => money(r.cashBills) },
    { key: "trIssued", label: "TR Issued", align: "right", render: (r) => money(r.trIssued) },
    { key: "expectedCash", label: "Expected", align: "right", render: (r) => money(r.expectedCash) },
    { key: "actualCash", label: "Actual", align: "right", render: (r) => money(r.actualCash) },
    {
      key: "difference", label: "Difference", align: "right",
      render: (r) => {
        const c = Number(r.difference) === 0 ? brand.success : Number(r.difference) > 0 ? brand.goldDark : brand.danger;
        return (
          <Box component="span" sx={{
            display: "inline-block", fontWeight: 800, fontSize: 12.5, color: c,
            px: 1.2, py: 0.4, borderRadius: 1.5, border: `1.5px solid ${c}`, background: `${c}14`,
          }}>
            {signedMoney(r.difference)}
          </Box>
        );
      },
    },
    {
      key: "status", label: "Status",
      render: (r) => (
        <Box component="span" sx={{
          fontSize: 11, fontWeight: 800, px: 1.2, py: 0.4, borderRadius: 5, color: "#fff",
          background: STATUS_STYLE[r.status]?.bg || brand.slate,
        }}>
          {r.status}
        </Box>
      ),
    },
    {
      key: "actions", label: "", align: "center",
      render: (r) => (
        <IconButton size="small" onClick={() => setDeleteTarget(r)} sx={{ color: brand.danger }}>
          <FaTrashAlt size={12} />
        </IconButton>
      ),
    },
  ];
  const exportCols = historyCols.slice(0, 8).map((c) => ({ key: c.key, label: c.label }));

  return (
    <>
      <SectionCard
        title="Daily Closing — Physical Cash Verification"
        action={
          <>
            <Button size="small" variant="contained" startIcon={<FaFileExcel />}
              disabled={exportingReport || exportingReportPdf}
              sx={{ background: brand.success, color: "#fff", mr: 1, "&:hover": { background: "#166B44" } }}
              onClick={exportDailyReport}>
              {exportingReport ? "Building…" : "Daily Closing Report (Excel)"}
            </Button>
            <Button size="small" variant="contained" startIcon={<FaFilePdf />}
              disabled={exportingReport || exportingReportPdf}
              sx={{ background: brand.danger, color: "#fff", "&:hover": { background: "#9E2E22" } }}
              onClick={exportDailyReportPdf}>
              {exportingReportPdf ? "Building…" : "Daily Closing Report (PDF)"}
            </Button>
          </>
        }
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5 }}>
          {/* Cash counting comes first — count the drawer before checking it against the expected total */}
          <Box sx={{ flex: "1 1 420px", minWidth: 0, pr: { md: 1.5 } }}>
            <Box sx={{
              mb: 1.5, p: 1.1, borderRadius: 2.5, border: `1.5px solid ${brand.gold}`,
              background: "rgba(212,175,55,0.06)",
            }}>
              <Typography fontWeight={800} fontSize={13} sx={{ mb: 1, color: brand.ink }}>Count Physical Cash</Typography>
              <Box sx={{ borderRadius: 0, overflow: "hidden", border: "1px solid #E5E9F2" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {["Denomination", "Qty", "Amount"].map((h, i) => (
                        <th key={h} style={{
                          background: brand.tableCardBg, color: brand.tableCardHeaderText,
                          textAlign: i === 0 ? "left" : i === 1 ? "center" : "right",
                          padding: "5px 9px", fontWeight: 800, borderBottom: `2px solid ${brand.gold}`,
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
                          <td style={{ padding: "4px 9px", borderBottom: "1px solid #E5E9F2", fontWeight: 800, color: brand.blueDeep }}>
                            Rs. {d.toLocaleString()}
                          </td>
                          <td style={{ padding: "3px 9px", borderBottom: "1px solid #E5E9F2", textAlign: "center" }}>
                            <TextField
                              size="small" type="number" placeholder="Qty" value={counts[d] ?? ""}
                              onChange={(e) => setCounts({ ...counts, [d]: e.target.value })}
                              sx={{ width: 76, "& .MuiInputBase-input": { py: 0.5, fontSize: 12.5 } }}
                            />
                          </td>
                          <td style={{ padding: "4px 9px", borderBottom: "1px solid #E5E9F2", textAlign: "right", fontWeight: 800, color: brand.ink }}>
                            {money(d * qty)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>

              <Box sx={{
                mt: 1.2, p: 1.2, borderRadius: 2.5, background: `linear-gradient(135deg, ${brand.gold} 0%, ${brand.goldDark} 100%)`, border: `1px solid ${brand.goldDark}`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <Typography fontWeight={800} fontSize={13} color={brand.ink}>Actual Cash Counted</Typography>
                <Typography fontSize={17} fontWeight={900} color={brand.ink}>{money(actualCash)}</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ flex: "1 1 340px", minWidth: 0, pl: { md: 2 }, borderLeft: { md: "1px solid #E5E9F2" } }}>
            {/* CLOSING SECTION — now with more spacing and proper bordered container */}
            <Box sx={{
              p: 1.3, borderRadius: 2.5, border: `1.5px solid rgba(15,76,129,0.2)`,
              background: "#dfebfa", mt: { xs: 3, md: 0 }, mb: 1.5,
            }}>
              <Typography fontWeight={800} sx={{ mb: 1, color: brand.ink, fontSize: 13.5 }}>
                Closing Summary
              </Typography>
              <DateFieldDMY label="Closing Date" value={date} onChange={(e) => setDate(e.target.value)} size="small" sx={{ mb: 1.5 }} />

              <Box sx={{ borderRadius: 2.5, overflow: "hidden", border: "1px solid #E5E9F2" }}>
                {lines.map((l) => (
                  <Box key={l.label} sx={{
                    display: "flex", justifyContent: "space-between", gap: 1.5, px: 1.5, py: 0.8,
                    background: l.strong ? brand.blueDeep : brand.rowBlue,
                    color: l.strong ? "#fff" : brand.rowText,
                    borderTop: "1px solid #E5E9F2",
                  }}>
                    <Typography fontSize={11.5} fontWeight={l.strong ? 800 : 600}>{l.label}</Typography>
                    <Typography fontSize={11.5} fontWeight={800}>{l.value}</Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{
                mt: 1.5, p: 1.5, borderRadius: 2.5, background: style.bg, color: "#fff", textAlign: "center",
                border: "2px solid rgba(255,255,255,0.3)",
              }}>
                <Typography fontSize={11} fontWeight={700} sx={{ opacity: 0.9 }}>Cash Difference</Typography>
                <Typography fontSize={22} fontWeight={900}>
                  {signedMoney(difference)}
                </Typography>
                <Typography fontSize={11.5} fontWeight={800} letterSpacing={1}>{style.label}</Typography>
                <Typography fontSize={10.5} sx={{ mt: 0.5, opacity: 0.92 }}>
                  Actual {money(actualCash)} vs Expected {money(expected)}
                </Typography>
              </Box>

              <TextField fullWidth size="small" label="Remarks" sx={{ mt: 1.5 }} value={remarks}
                onChange={(e) => setRemarks(e.target.value)} />
              <Box sx={{ display: "flex", gap: 1.2, mt: 1.5 }}>
                <Button fullWidth variant="contained" onClick={save}
                  sx={{ height: 36, background: brand.blueDeep, fontWeight: 800, "&:hover": { background: brand.navy } }}>
                  Save Daily Closing
                </Button>
              </Box>
              <Button fullWidth variant="contained" startIcon={<FaPrint size={12} />}
                onClick={printCashCounting}
                sx={{ mt: 1.2, height: 34, background: brand.gold, color: brand.navy, fontWeight: 800,
                  "&:hover": { background: brand.goldDark, color: "#fff" } }}>
                Print Cash Counting
              </Button>
            </Box>
          </Box>
        </Box>
      </SectionCard>

      <SectionCard
        title="Daily Closing History"
        action={
          <>
            <Button size="small" variant="outlined" startIcon={<FaFileExcel />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
              onClick={() => exportExcel("Daily Closing Report", exportCols, history)}>Excel</Button>
            <Button size="small" variant="outlined" startIcon={<FaPrint />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
              onClick={() => printDocument({ title: "Daily Closing Report", subtitle: "Cash Book", landscape: true, bodyHtml: tableHtml(exportCols, history) })}>Print</Button>
          </>
        }
      >
        <DataTable columns={historyCols} rows={history} empty="No closings saved yet" />
      </SectionCard>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Are you sure?"
        message="Are you sure you want to delete this record?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
