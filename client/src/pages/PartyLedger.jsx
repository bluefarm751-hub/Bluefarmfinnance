import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Chip, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { FaFileExcel, FaFilePdf, FaPrint, FaBalanceScale, FaUsersCog, FaChevronDown, FaChevronUp } from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import LedgerTabs from "../components/LedgerTabs";
import { SectionCard, money } from "../components/CashBook/ui";
import { getPartyLedgerSummary, getParties } from "../api/ledgerApi";
import { useToast } from "../utils/useToast";
import { brand } from "../theme";
import { exportExcel } from "../utils/exportExcel";
import { printDocument, tableHtml } from "../utils/print";

const num = (v) => Number(v || 0);
const fmt = (v) => `Rs. ${num(v).toLocaleString()}`;

const billColumns = [
  { key: "billNo", label: "Bill No" },
  { key: "billDate", label: "Date" },
  { key: "item", label: "Description" },
  { key: "amount", label: "Bill Amount", align: "right", render: (r) => fmt(r.amount) },
  { key: "status", label: "Status" },
  { key: "paid", label: "Paid", align: "right", render: (r) => fmt(r.paid) },
  { key: "payable", label: "Payable", align: "right", render: (r) => fmt(r.payable) },
  { key: "remaining", label: "Paid Balance After Bill", align: "right", render: (r) => fmt(r.remaining) },
];

function SummaryCard({ label, value, gradient }) {
  return (
    <Box sx={{ background: gradient, color: "#fff", borderRadius: 4, p: 2.4, minHeight: 120, boxShadow: "0 10px 28px rgba(8,33,63,0.18)", border: "2px solid rgba(255,255,255,0.2)" }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, opacity: 0.9, textTransform: "uppercase", letterSpacing: .5 }}>{label}</Typography>
      <Typography sx={{ fontSize: 25, fontWeight: 900, mt: .5 }}>{fmt(value)}</Typography>
    </Box>
  );
}

export default function PartyLedger() {
  const navigate = useNavigate();
  const { ToastUI } = useToast();
  const farm = localStorage.getItem("farm") || "Blue Farm";
  const [parties, setParties] = useState([]);
  const [party, setParty] = useState("");
  const [data, setData] = useState({ summary: [], totals: { business: 0, paid: 0, payable: 0 } });
  const [loading, setLoading] = useState(false);
  const [openHeads, setOpenHeads] = useState({});

  useEffect(() => {
    getParties().then((r) => setParties(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!party) {
      setData({ summary: [], totals: { business: 0, paid: 0, payable: 0 } });
      return;
    }
    setLoading(true);
    getPartyLedgerSummary(party)
      .then((r) => {
        setData(r.data || { summary: [], totals: { business: 0, paid: 0, payable: 0 } });
        const next = {};
        (r.data?.summary || []).forEach((g, i) => { next[g.headId || `h${i}`] = true; });
        setOpenHeads(next);
      })
      .catch((e) => console.log(e))
      .finally(() => setLoading(false));
  }, [party]);

  const flatRows = useMemo(() => data.summary.flatMap((g) => g.bills.map((b) => ({
    ...b, billNo: b.sNo ? `BILL-${b.sNo}` : `BILL-${b.id}`, headName: g.headName,
  }))), [data.summary]);

  const exportColumns = [
    { key: "headName", label: "Head" },
    ...billColumns,
  ];

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 4 }}>
        <LedgerTabs />
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: .5 }}>
          <Typography variant="h4" fontWeight="bold">Party Ledger</Typography>
          <Button variant="outlined" startIcon={<FaUsersCog />} onClick={() => navigate("/ledger/parties")}>Manage Parties</Button>
        </Box>
        <Typography color="text.secondary" mb={3}>Contractor-wise data is pulled directly from the bills already added. Bills are grouped head-wise. Total paid is shown first, each paid bill is deducted one-by-one, and payable bills stay separate at the end without reducing the paid balance.</Typography>

        <SectionCard title={<><FaBalanceScale style={{ marginRight: 8, verticalAlign: -2 }} />Party Ledger — {farm}</>}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" select label="Party / Contractor" value={party} onChange={(e) => setParty(e.target.value)}>
                <MenuItem value="">Select a party</MenuItem>
                {parties.map((p) => <MenuItem key={p.name} value={p.name}>{p.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: { xs: "flex-start", md: "flex-end" }, gap: 1, flexWrap: "wrap" }}>
                <Button size="small" variant="outlined" disabled={!flatRows.length} startIcon={<FaFileExcel />} onClick={() => exportExcel(`Party Ledger - ${party}`, exportColumns, flatRows)}>Excel</Button>
                <Button size="small" variant="outlined" disabled={!flatRows.length} startIcon={<FaFilePdf />} onClick={() => printDocument({ title: `Party Ledger — ${party}`, subtitle: `${party} · ${farm}`, landscape: true, bodyHtml: tableHtml(exportColumns, flatRows) })}>PDF</Button>
                <Button size="small" variant="outlined" disabled={!flatRows.length} startIcon={<FaPrint />} onClick={() => printDocument({ title: `Party Ledger — ${party}`, subtitle: `${party} · ${farm}`, landscape: true, bodyHtml: tableHtml(exportColumns, flatRows) })}>Print</Button>
              </Box>
            </Grid>
          </Grid>

          {!party ? (
            <Box sx={{ textAlign: "center", py: 6, borderRadius: 4, border: `1.5px dashed ${brand.gold}`, background: "rgba(212,175,55,0.06)" }}>
              <Typography sx={{ color: brand.slate, fontWeight: 600 }}>Select a contractor to automatically pull all of their bills head-wise.</Typography>
            </Box>
          ) : (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}><SummaryCard label="Total Payment Made" value={data.totals.paid} gradient="linear-gradient(135deg,#2FBF71 0%,#1B8A50 100%)" /></Grid>
                <Grid item xs={12} sm={4}><SummaryCard label="Remaining Payable" value={data.totals.payable} gradient="linear-gradient(135deg,#F0574D 0%,#C0392B 100%)" /></Grid>
                <Grid item xs={12} sm={4}><SummaryCard label="Total Bill Amount" value={data.totals.business} gradient="linear-gradient(135deg,#1E88E5 0%,#1565C0 100%)" /></Grid>
              </Grid>

              {loading ? <Typography sx={{ py: 4, textAlign: "center" }}>Loading ledger...</Typography> : data.summary.length === 0 ? (
                <Box sx={{ py: 5, textAlign: "center" }}><Typography>No bills found for {party}.</Typography></Box>
              ) : data.summary.map((g, idx) => {
                const key = g.headId || `h${idx}`;
                const open = openHeads[key] !== false;
                return (
                  <Box key={key} sx={{ mb: 2.2, borderRadius: 3, overflow: "hidden", border: "1px solid rgba(15,76,129,.18)", boxShadow: "0 8px 22px rgba(8,33,63,.08)" }}>
                    <Box sx={{ p: 2, background: "linear-gradient(135deg,#0F4C81 0%,#16608f 100%)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.5, flexWrap: "wrap", cursor: "pointer" }} onClick={() => setOpenHeads((p) => ({ ...p, [key]: !open }))}>
                      <Box>
                        <Typography fontWeight={900} fontSize={18}>{g.headName}</Typography>
                        <Typography sx={{ fontSize: 12.5, opacity: .9 }}>Total Paid: {fmt(g.paid)} · Bills: {fmt(g.totalBill)} · Payable: {fmt(g.payable)} · Paid Balance Left: {fmt(g.remaining)}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Chip size="small" label={`Paid ${fmt(g.paid)}`} sx={{ background: "rgba(47,191,113,.18)", color: "#fff", border: "1px solid rgba(255,255,255,.35)" }} />
                        <Chip size="small" label={`Payable ${fmt(g.payable)}`} sx={{ background: "rgba(240,87,77,.18)", color: "#fff", border: "1px solid rgba(255,255,255,.35)" }} />
                        {open ? <FaChevronUp /> : <FaChevronDown />}
                      </Box>
                    </Box>

                    {open && (
                      <Box sx={{ p: 1.5, background: "#fff" }}>
                        <Box sx={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 950 }}>
                            <thead><tr>{["#","Bill No","Date","Description","Bill Amount","Status","Paid","Payable","Remaining Amount"].map((h) => <th key={h} style={{ textAlign: ["Bill Amount","Paid","Payable","Remaining Amount"].includes(h) ? "right" : "left", padding: "11px 10px", background: "#f1f6fa", color: "#0F4C81", borderBottom: "1px solid #d9e4ec", fontSize: 12.5 }}>{h}</th>)}</tr></thead>
                            <tbody>
                              {g.bills.map((b, i) => <tr key={b.id}><td style={{ padding: "10px", borderBottom: "1px solid #edf1f4" }}>{i + 1}</td><td style={{ padding: "10px", borderBottom: "1px solid #edf1f4", fontWeight: 700 }}>{b.sNo ? `BILL-${b.sNo}` : `BILL-${b.id}`}</td><td style={{ padding: "10px", borderBottom: "1px solid #edf1f4" }}>{b.billDate || "—"}</td><td style={{ padding: "10px", borderBottom: "1px solid #edf1f4" }}>{b.item || "—"}</td><td style={{ padding: "10px", textAlign: "right", borderBottom: "1px solid #edf1f4", fontWeight: 800 }}>{fmt(b.amount)}</td><td style={{ padding: "10px", borderBottom: "1px solid #edf1f4" }}><Chip size="small" label={b.status || "Not Paid"} color={String(b.status).toLowerCase() === "paid" ? "success" : "error"} variant="outlined" /></td><td style={{ padding: "10px", textAlign: "right", borderBottom: "1px solid #edf1f4" }}>{fmt(b.paid)}</td><td style={{ padding: "10px", textAlign: "right", borderBottom: "1px solid #edf1f4" }}>{fmt(b.payable)}</td><td style={{ padding: "10px", textAlign: "right", borderBottom: "1px solid #edf1f4", fontWeight: 900, color: b.remaining < 0 ? "#C0392B" : "#1B5E3B" }}>{fmt(b.remaining)}</td></tr>)}
                            </tbody>
                            <tfoot><tr><td colSpan={4} style={{ padding: "12px 10px", fontWeight: 900, color: "#0F4C81" }}>Head Total / Final Paid Balance</td><td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 900 }}>{fmt(g.totalBill)}</td><td></td><td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 900 }}>{fmt(g.paid)}</td><td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 900 }}>{fmt(g.payable)}</td><td style={{ padding: "12px 10px", textAlign: "right", fontWeight: 900, color: g.remaining < 0 ? "#C0392B" : "#1B5E3B" }}>{fmt(g.remaining)}</td></tr></tfoot>
                          </table>
                        </Box>
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
