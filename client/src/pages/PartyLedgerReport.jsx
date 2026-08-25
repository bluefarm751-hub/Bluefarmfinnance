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

const baseColumns = [
  { key: "headName", label: "Head" },
  { key: "billNo", label: "Bill No" },
  { key: "billDate", label: "Date" },
  { key: "item", label: "Description" },
  { key: "amount", label: "Bill Amount", align: "right", render: (r) => fmt(r.amount) },
  { key: "status", label: "Status" },
  { key: "paid", label: "Paid", align: "right", render: (r) => fmt(r.paid) },
  { key: "payable", label: "Payable", align: "right", render: (r) => fmt(r.payable) },
  { key: "remaining", label: "Head Remaining", align: "right", render: (r) => fmt(r.remaining) },
];

export default function PartyLedgerReport({ mode = "excel" }) {
  const navigate = useNavigate();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const isExcel = mode === "excel";
  const [parties, setParties] = useState([]);
  const [party, setParty] = useState("");
  const [data, setData] = useState({ summary: [], totals: { business: 0, paid: 0, payable: 0 } });
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getParties().then((r) => setParties(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const selectedParty = party === "__ALL__" ? "" : party;
    if (!party) {
      setData({ summary: [], totals: { business: 0, paid: 0, payable: 0 } });
      return;
    }
    setLoading(true);
    getPartyLedgerSummary(selectedParty, { fromDate, toDate })
      .then((r) => setData(r.data || { summary: [], totals: { business: 0, paid: 0, payable: 0 } }))
      .catch(() => setData({ summary: [], totals: { business: 0, paid: 0, payable: 0 } }))
      .finally(() => setLoading(false));
  }, [party, fromDate, toDate]);

  const isAll = party === "__ALL__";
  const columns = useMemo(() => isAll ? [{ key: "partyName", label: "Party" }, ...baseColumns] : baseColumns, [isAll]);
  const rows = useMemo(() => data.summary.flatMap((g) => g.bills.map((b) => ({
    ...b,
    partyName: g.partyName,
    billNo: b.sNo ? `BILL-${b.sNo}` : `BILL-${b.id}`,
    headName: g.headName,
  }))), [data.summary]);

  const runExport = () => {
    if (!party || !rows.length || (fromDate && toDate && fromDate > toDate)) return;
    const reportParty = isAll ? "All Contractors" : party;
    const dateText = fromDate || toDate ? ` · ${fromDate || "Start"} to ${toDate || "End"}` : "";
    if (isExcel) {
      exportExcel(`Party_Ledger_${reportParty.replace(/\s+/g, "_")}`, columns, rows);
      return;
    }
    printDocument({
      title: `Party Ledger — ${reportParty}`,
      subtitle: `${farm}${dateText} · Total Business ${fmt(data.totals.business)} · Paid ${fmt(data.totals.paid)} · Payable ${fmt(data.totals.payable)}`,
      landscape: true,
      bodyHtml: tableHtml(columns, rows),
    });
  };

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 1 }}>
          <Box>
            <Chip icon={<FaBalanceScale />} label="PARTY LEDGER REPORT" sx={{ mb: 1, background: `${brand.gold}22`, border: `1px solid ${brand.gold}`, color: brand.goldDark, fontWeight: 800 }} />
            <Typography variant="h4" fontWeight="bold">Party Ledger Report — {isExcel ? "Excel" : "PDF"}</Typography>
            <Typography color="text.secondary" mt={0.5}>Separate contractor-wise report. Payable bills are reported separately and do not reduce the Party Ledger balance.</Typography>
          </Box>
          <Button variant="outlined" startIcon={<FaArrowLeft />} onClick={() => navigate("/ledger/party")}>Back to Party Ledger</Button>
        </Box>

        <SectionCard title={<><FaBalanceScale style={{ marginRight: 8, verticalAlign: -2 }} />Party Ledger Report — {farm}</>}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <TextField fullWidth size="small" select label="Party / Contractor" value={party} onChange={(e) => setParty(e.target.value)}>
                <MenuItem value="">Select a party</MenuItem>
                <MenuItem value="__ALL__">All Contractors — Consolidated</MenuItem>
                {parties.map((p) => <MenuItem key={p.name} value={p.name}>{p.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField fullWidth size="small" type="date" label="From Date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField fullWidth size="small" type="date" label="To Date" value={toDate} onChange={(e) => setToDate(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={3}>
              <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: { xs: "flex-start", md: "flex-end" }, gap: 1 }}>
                <Button variant="contained" disabled={!party || !rows.length || loading || (fromDate && toDate && fromDate > toDate)} startIcon={isExcel ? <FaFileExcel /> : <FaFilePdf />} onClick={runExport}>
                  {isExcel ? "Download Excel" : "Generate PDF"}
                </Button>
              </Box>
            </Grid>
          </Grid>

          {!party ? (
            <Box sx={{ textAlign: "center", py: 6, borderRadius: 4, border: `1.5px dashed ${brand.gold}`, background: "rgba(212,175,55,0.06)" }}>
              <Typography sx={{ color: brand.slate, fontWeight: 600 }}>Select a contractor or “All Contractors — Consolidated”, then optionally set a date range.</Typography>
            </Box>
          ) : loading ? (
            <Typography sx={{ py: 5, textAlign: "center" }}>Loading party ledger...</Typography>
          ) : (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}><Box sx={{ p: 2, borderRadius: 3, background: "linear-gradient(135deg,#1E88E5 0%,#1565C0 100%)", color: "#fff" }}><Typography variant="caption">TOTAL BUSINESS</Typography><Typography variant="h6" fontWeight={900}>{fmt(data.totals.business)}</Typography></Box></Grid>
                <Grid item xs={12} sm={4}><Box sx={{ p: 2, borderRadius: 3, background: "linear-gradient(135deg,#2FBF71 0%,#1B8A50 100%)", color: "#fff" }}><Typography variant="caption">PAID AMOUNT</Typography><Typography variant="h6" fontWeight={900}>{fmt(data.totals.paid)}</Typography></Box></Grid>
                <Grid item xs={12} sm={4}><Box sx={{ p: 2, borderRadius: 3, background: "linear-gradient(135deg,#F0574D 0%,#C0392B 100%)", color: "#fff" }}><Typography variant="caption">PAYABLE AMOUNT</Typography><Typography variant="h6" fontWeight={900}>{fmt(data.totals.payable)}</Typography></Box></Grid>
              </Grid>
              {!rows.length ? <Typography sx={{ py: 5, textAlign: "center" }}>No bills found for {party}.</Typography> : (
                <Box sx={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
                    <thead><tr>{columns.map((c) => <th key={c.key} style={{ textAlign: c.align || "left", padding: "11px 10px", background: "#f1f6fa", color: "#0F4C81", borderBottom: "1px solid #d9e4ec", fontSize: 12.5 }}>{c.label}</th>)}</tr></thead>
                    <tbody>{rows.map((r, i) => <tr key={`${r.id}-${i}`}>{columns.map((c) => <td key={c.key} style={{ textAlign: c.align || "left", padding: "10px", borderBottom: "1px solid #edf1f4", fontWeight: c.key === "amount" ? 800 : 400 }}>{c.render ? c.render(r) : (r[c.key] ?? "—")}</td>)}</tr>)}</tbody>
                  </table>
                </Box>
              )}
            </>
          )}
        </SectionCard>
      </Box>
    </MainLayout>
  );
}
