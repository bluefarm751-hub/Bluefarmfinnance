import { useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, TextField, Typography, IconButton } from "@mui/material";
import { FaTrashAlt, FaFileExcel, FaPrint } from "react-icons/fa";
import { SectionCard, DataTable, money, signedMoney, today } from "./ui";
import { getClosingSummary, getClosings, saveClosing, deleteClosing, getCashSummary } from "../../api/cashbookApi";
import { exportExcel } from "../../utils/exportExcel";
import { printDocument, tableHtml } from "../../utils/print";
import { brand } from "../../theme";
import DateFieldDMY from "../DateFieldDMY";
import ConfirmDialog from "../ConfirmDialog";

const NOTES = [5000, 1000, 500, 100, 50, 20, 10];
const COINS = [5, 2, 1];
const DENOMS = [...NOTES, ...COINS];

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

  const printSlip = () => {
    const denomRows = DENOMS.map((d) => {
      const qty = Number(counts[d]) || 0;
      return `
        <tr>
          <td>Rs. ${d.toLocaleString()}</td>
          <td style="text-align:center;">${qty || ""}</td>
          <td style="text-align:right;">${(d * qty).toLocaleString()}</td>
        </tr>`;
    }).join("");

    const diffColor = difference === 0 ? "#1E8E5A" : difference > 0 ? "#B8860B" : "#C0392B";

    const bodyHtml = `
      <div style="margin-bottom:18px;">
        <table>
          <thead>
            <tr><th colspan="3" style="text-align:center;">Cash In Hand</th></tr>
            <tr>
              <th>Denomination</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${denomRows}
            <tr>
              <td colspan="2" style="font-weight:800;">Total</td>
              <td style="text-align:right;font-weight:800;">${actualCash.toLocaleString()}</td>
            </tr>
            <tr>
              <td colspan="2" style="font-weight:800;color:#fff;background:${diffColor};">Differ</td>
              <td style="text-align:right;font-weight:800;color:#fff;background:${diffColor};">${signedMoney(difference)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table>
        <tbody>
          <tr>
            <td style="font-weight:700;">Cash</td>
            <td style="text-align:right;font-weight:800;">${money(expected)}</td>
          </tr>
          <tr>
            <td style="font-weight:700;">TR</td>
            <td style="text-align:right;font-weight:800;">${money(trAmt)}</td>
          </tr>
          <tr>
            <td style="font-weight:800;background:#F4E27A;">Cash In Hand</td>
            <td style="text-align:right;font-weight:800;background:#F4E27A;">${money(cashInHandGross)}</td>
          </tr>
          <tr><td colspan="2" style="border:none;padding:4px;"></td></tr>
          <tr>
            <td style="font-weight:800;background:#9BCB7B;">Cash In Bank</td>
            <td style="text-align:right;font-weight:800;background:#9BCB7B;">${money(cashInBank)}</td>
          </tr>
          <tr><td colspan="2" style="border:none;padding:4px;"></td></tr>
          <tr>
            <td style="font-weight:800;color:#fff;background:${brand.blueDeep};">TOTAL</td>
            <td style="text-align:right;font-weight:800;color:#fff;background:${brand.blueDeep};">${money(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      ${remarks ? `<div style="margin-top:16px;"><b>Remarks:</b> ${String(remarks).replace(/</g, "&lt;")}</div>` : ""}
    `;

    printDocument({
      title: `Daily Closing (${formatDMY(date)})`,
      subtitle: "Cash Book",
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
      <SectionCard title="Daily Closing — Physical Cash Verification">
        <Grid container spacing={4}>
          {/* Cash counting comes first — count the drawer before checking it against the expected total */}
          <Grid item xs={12} md={7} sx={{ pr: { md: 2 } }}>
            <Box sx={{
              mb: 2, p: 1.8, borderRadius: 3, border: `1.5px solid ${brand.gold}`,
              background: "rgba(212,175,55,0.06)",
            }}>
              <Typography fontWeight={800} sx={{ mb: 1.5, color: brand.ink }}>Count Physical Cash</Typography>
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
                      const qty = Number(counts[d]) || 0;
                      return (
                        <tr key={d} style={{ background: qty ? "rgba(212,175,55,0.08)" : i % 2 ? "rgba(238,243,251,0.5)" : "#fff" }}>
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
                mt: 2, p: 2, borderRadius: 3, background: brand.panel, border: "1px solid rgba(15,76,129,0.14)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <Typography fontWeight={800} color={brand.ink}>Actual Cash Counted</Typography>
                <Typography variant="h6" fontWeight={900} color={brand.blueDeep}>{money(actualCash)}</Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={5} sx={{ pl: { md: 3 }, borderLeft: { md: "1px solid #E5E9F2" } }}>
            {/* CLOSING SECTION — now with more spacing and proper bordered container */}
            <Box sx={{
              p: 2, borderRadius: 3, border: `1.5px solid rgba(15,76,129,0.2)`,
              background: "#fff", mt: { xs: 4, md: 0 }, mb: 2,
            }}>
              <Typography fontWeight={800} sx={{ mb: 1.5, color: brand.ink, fontSize: 15 }}>
                Closing Summary
              </Typography>
              <DateFieldDMY label="Closing Date" value={date} onChange={(e) => setDate(e.target.value)} size="small" sx={{ mb: 2 }} />

              <Box sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid #E5E9F2" }}>
                {lines.map((l) => (
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

              <TextField fullWidth size="small" label="Remarks" sx={{ mt: 2 }} value={remarks}
                onChange={(e) => setRemarks(e.target.value)} />
              <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
                <Button fullWidth variant="contained" onClick={save}
                  sx={{ height: 42, background: brand.blueDeep, fontWeight: 800, "&:hover": { background: brand.navy } }}>
                  Save Daily Closing
                </Button>
                <Button variant="outlined" startIcon={<FaPrint />} onClick={printSlip}
                  sx={{ height: 42, whiteSpace: "nowrap", fontWeight: 800, color: brand.blueDeep, borderColor: brand.blueDeep }}>
                  Print
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
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
