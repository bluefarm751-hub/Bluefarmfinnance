import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Chip, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { FaFileExcel, FaFilePdf, FaPrint, FaBalanceScale, FaUsersCog, FaChevronDown, FaChevronUp } from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import LedgerTabs from "../components/LedgerTabs";
import { SectionCard, DataTable, money } from "../components/CashBook/ui";
import { getParties } from "../api/ledgerApi";
import { getBills, getFinanceHeads } from "../api/financeApi";
import { useToast } from "../utils/useToast";
import { brand } from "../theme";
import { months, years, currentYearValue, monthRange } from "../utils/ledgerFilters";
import { exportExcel } from "../utils/exportExcel";
import { printDocument, tableHtml } from "../utils/print";

const num = (v) => Number(v || 0);
const fmt = (v) => `Rs. ${num(v).toLocaleString()}`;

const billColumns = [
  { key: "billNo", label: "Bill No" },
  { key: "billDate", label: "Date", render: (r) => r.billDate || "—" },
  { key: "item", label: "Description", render: (r) => r.item || "—" },
  { key: "amount", label: "Bill Amount", align: "right", render: (r) => fmt(r.amount) },
  { key: "status", label: "Status", render: (r) => <Chip size="small" label={r.status || "Not Paid"} color={String(r.status).toLowerCase() === "paid" ? "success" : "error"} variant="outlined" /> },
  { key: "paid", label: "Paid", align: "right", render: (r) => fmt(r.paid) },
  { key: "payable", label: "Payable", align: "right", render: (r) => fmt(r.payable) },
  { key: "remaining", label: "Paid Balance After Bill", align: "right", render: (r) => <span style={{ fontWeight: 900, color: r.remaining < 0 ? "#C0392B" : "#1B5E3B" }}>{fmt(r.remaining)}</span> },
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
  const [month, setMonth] = useState(0);
  const [year, setYear] = useState(currentYearValue);
  const [heads, setHeads] = useState([]);
  const [head, setHead] = useState("");

  useEffect(() => {
    getParties().then((r) => setParties(r.data || [])).catch(() => {});
    getFinanceHeads().then((r) => setHeads(r.data || [])).catch(() => setHeads([]));
  }, []);

  useEffect(() => {
    if (!party) {
      setData({ summary: [], totals: { business: 0, paid: 0, payable: 0 } });
      return;
    }
    setLoading(true);

    const normalize = (v) => String(v ?? "").trim().toLowerCase();
    const { fromDate, toDate } = monthRange(month, year);
    const buildFromBills = (bills) => {
      const matching = (bills || []).filter((b) => {
        const d = String(b.billDate || "").slice(0, 10);
        const partyOk = normalize(b.contractorName) === normalize(party);
        const dateOk = (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
        const headOk = !head || String(b.headId ?? "") === String(head);
        return partyOk && dateOk && headOk;
      });
      const groups = new Map();
      let business = 0;
      let paidTotal = 0;
      let payableTotal = 0;

      matching.forEach((b) => {
        const amount = Number(b.amount || 0);
        const isPaid = normalize(b.status) === "paid";
        const paid = isPaid ? amount : 0;
        const payable = isPaid ? 0 : amount;
        business += amount;
        paidTotal += paid;
        payableTotal += payable;

        const headId = b.headId ?? null;
        const headName = String(b.headName || "Unassigned Head").trim() || "Unassigned Head";
        const key = `${headId ?? `name:${normalize(headName)}`}`;
        if (!groups.has(key)) {
          groups.set(key, {
            headId, headName, totalBill: 0, paid: 0, payable: 0, remaining: 0, bills: [],
          });
        }
        const g = groups.get(key);
        g.totalBill += amount;
        g.paid += paid;
        g.payable += payable;
        g.bills.push({
          id: b.id, sNo: b.sNo, billDate: b.billDate || "", item: b.item || b.remarks || "",
          amount, status: b.status || "Not Paid", paid, payable, paymentMode: b.paymentMode || "", remarks: b.remarks || "",
        });
      });

      groups.forEach((g) => {
        g.bills.sort((a, b) => {
          const ap = a.paid > 0 ? 0 : 1;
          const bp = b.paid > 0 ? 0 : 1;
          if (ap !== bp) return ap - bp;
          const dc = String(a.billDate).localeCompare(String(b.billDate));
          if (dc !== 0) return dc;
          return Number(a.id) - Number(b.id);
        });
        let running = g.paid;
        g.bills.forEach((b) => {
          if (b.paid > 0) running = Math.max(0, running - b.paid);
          b.remaining = running;
        });
        g.remaining = running;
      });

      const summary = Array.from(groups.values()).sort((a, b) => a.headName.localeCompare(b.headName));
      return { summary, totals: { business, paid: paidTotal, payable: payableTotal } };
    };

    (async () => {
      try {
        // Party Ledger is intentionally driven by the actual Bills table.
        // First use the current farm, then fall back to all bills when older
        // records have a missing/different farm tag.
        let billRes = await getBills();
        let nextData = buildFromBills(billRes.data || []);

        if (!nextData.summary.length) {
          const allRes = await getBills(undefined, { allFarms: true });
          nextData = buildFromBills(allRes.data || []);
        }

        setData(nextData);
        const next = {};
        nextData.summary.forEach((g, i) => { next[g.headId || `h${i}`] = true; });
        setOpenHeads(next);
      } catch (e) {
        console.error("Party Ledger bills load:", e);
        setData({ summary: [], totals: { business: 0, paid: 0, payable: 0 } });
      } finally {
        setLoading(false);
      }
    })();
  }, [party, month, year, head]);

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
          <Button variant="contained" startIcon={<FaUsersCog />} sx={{ background: brand.blueDeep, color: "#fff", "&:hover": { background: brand.navy } }} onClick={() => navigate("/ledger/parties")}>Manage Parties</Button>
        </Box>
        <Typography color="text.secondary" mb={3}>Contractor-wise data is pulled directly from the bills already added. Bills are grouped head-wise. Total paid is shown first, each paid bill is deducted one-by-one, and payable bills stay separate at the end without reducing the paid balance.</Typography>

        <SectionCard title={<><FaBalanceScale style={{ marginRight: 8, verticalAlign: -2 }} />Party Ledger — {farm}</>}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" select label="Party / Contractor" sx={{ minWidth: 220 }} value={party} onChange={(e) => setParty(e.target.value)}>
                <MenuItem value="">Select a party</MenuItem>
                {parties.map((p) => <MenuItem key={p.name} value={p.name}>{p.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField fullWidth size="small" select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                <MenuItem value={0}>All Months</MenuItem>
                {months.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField fullWidth size="small" select label="Head" value={head} onChange={(e) => setHead(e.target.value)}>
                <MenuItem value="">All Heads</MenuItem>
                {heads.map((h) => <MenuItem key={h.id} value={String(h.id)}>{h.headName}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField fullWidth size="small" select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} disabled={!month}>
                {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: { xs: "flex-start", md: "flex-end" }, gap: 1, flexWrap: "wrap" }}>
                <Button size="small" variant="contained" disabled={!flatRows.length} startIcon={<FaFileExcel />} sx={{ background: "#1E8E5A", color: "#fff", "&:hover": { background: "#166A44" } }} onClick={() => exportExcel(`Party Ledger - ${party}`, exportColumns, flatRows)}>Excel</Button>
                <Button size="small" variant="contained" disabled={!flatRows.length} startIcon={<FaFilePdf />} sx={{ background: "#C0392B", color: "#fff", "&:hover": { background: "#96281B" } }} onClick={() => printDocument({ title: `Party Ledger — ${party}`, subtitle: `${party} · ${farm}${month ? ` · ${months[month - 1].label} ${year}` : ""}`, landscape: true, bodyHtml: tableHtml(exportColumns, flatRows) })}>PDF</Button>
                <Button size="small" variant="contained" disabled={!flatRows.length} startIcon={<FaPrint />} sx={{ background: "#0F4C81", color: "#fff", "&:hover": { background: "#08213F" } }} onClick={() => printDocument({ title: `Party Ledger — ${party}`, subtitle: `${party} · ${farm}${month ? ` · ${months[month - 1].label} ${year}` : ""}`, landscape: true, bodyHtml: tableHtml(exportColumns, flatRows) })}>Print</Button>
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
                      <Box sx={{ p: 1.5, background: brand.panelSoft }}>
                        <DataTable
                          columns={billColumns}
                          rows={g.bills.map((b) => ({ ...b, billNo: b.sNo ? `BILL-${b.sNo}` : `BILL-${b.id}` }))}
                          totalsRow={{
                            billNo: "Head Total / Final Paid Balance",
                            amount: fmt(g.totalBill),
                            paid: fmt(g.paid),
                            payable: fmt(g.payable),
                            remaining: <span style={{ color: g.remaining < 0 ? "#FFD2D2" : "#fff" }}>{fmt(g.remaining)}</span>,
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
