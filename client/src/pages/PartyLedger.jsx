import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { FaFileExcel, FaFilePdf, FaPrint, FaBalanceScale, FaUsersCog } from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import DateFieldDMY from "../components/DateFieldDMY";
import { SectionCard, DataTable, money, signedMoney } from "../components/CashBook/ui";
import { getPartyLedger, getParties } from "../api/ledgerApi";
import { exportExcel } from "../utils/exportExcel";
import { printDocument, tableHtml } from "../utils/print";
import { useToast } from "../utils/useToast";
import { brand, gradients } from "../theme";

const columns = [
  { key: "date", label: "Date" },
  { key: "voucherNo", label: "Voucher No" },
  { key: "description", label: "Description" },
  { key: "source", label: "Source" },
  { key: "debit", label: "Debit", align: "right", render: (r) => (r.debit ? money(r.debit) : "") },
  { key: "credit", label: "Credit", align: "right", render: (r) => (r.credit ? money(r.credit) : "") },
  { key: "balance", label: "Balance", align: "right", render: (r) => signedMoney(r.balance) },
];

export default function PartyLedger() {
  const navigate = useNavigate();
  const { ToastUI } = useToast();
  const farm = localStorage.getItem("farm") || "Blue Farm";

  const [parties, setParties] = useState([]);
  const [party, setParty] = useState("");
  const [filters, setFilters] = useState({ from: "", to: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getParties().then((r) => setParties(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!party) { setRows([]); return; }
    setLoading(true);
    getPartyLedger(party, filters)
      .then((r) => setRows(r.data || []))
      .catch((e) => console.log(e))
      .finally(() => setLoading(false));
    // eslint-disable-next-line
  }, [party, filters]);

  const totals = useMemo(() => {
    let debit = 0, credit = 0;
    rows.forEach((r) => { debit += Number(r.debit || 0); credit += Number(r.credit || 0); });
    return { debit, credit, balance: debit - credit };
  }, [rows]);

  const subtitle = `${party || "—"} · ${filters.from || "Start"} to ${filters.to || "Today"} · ${farm}`;
  const totalsRow = rows.length
    ? { description: "TOTAL", debit: money(totals.debit), credit: money(totals.credit), balance: signedMoney(totals.balance) }
    : null;

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 0.5 }}>
          <Typography variant="h4" fontWeight="bold">Party Ledger</Typography>
          <Button
            variant="outlined"
            startIcon={<FaUsersCog />}
            onClick={() => navigate("/ledger/parties")}
          >
            Manage Parties
          </Button>
        </Box>
        <Typography color="text.secondary" mb={3}>
          Select a party to see its own Debit / Credit account with a running balance.
        </Typography>

        <SectionCard
          title={<><FaBalanceScale style={{ marginRight: 8, verticalAlign: -2 }} />Party Ledger — {farm}</>}
          action={rows.length > 0 && (
            <>
              <Button size="small" variant="outlined" startIcon={<FaFileExcel />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
                onClick={() => exportExcel(`Party Ledger - ${party}`, columns, rows)}>Excel</Button>
              <Button size="small" variant="outlined" startIcon={<FaFilePdf />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
                onClick={() => printDocument({ title: `Party Ledger — ${party}`, subtitle: `${subtitle} — choose "Save as PDF"`, landscape: true, bodyHtml: tableHtml(columns, rows) })}>PDF</Button>
              <Button size="small" variant="outlined" startIcon={<FaPrint />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
                onClick={() => printDocument({ title: `Party Ledger — ${party}`, subtitle, landscape: true, bodyHtml: tableHtml(columns, rows) })}>Print</Button>
            </>
          )}
        >
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" select sx={{ minWidth: 180 }} label="Party" value={party} onChange={(e) => setParty(e.target.value)}>
                <MenuItem value="">Select a party</MenuItem>
                {parties.map((p) => <MenuItem key={p.name} value={p.name}>{p.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <DateFieldDMY label="From" size="small" value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <DateFieldDMY label="To" size="small" value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </Grid>
          </Grid>

          {!party ? (
            <Box sx={{ textAlign: "center", py: 6, borderRadius: 4, border: `1.5px dashed ${brand.gold}`, background: "rgba(212,175,55,0.06)" }}>
              <Typography sx={{ color: brand.slate, fontWeight: 600 }}>
                Select a party above to see their ledger. Don't see a party in the list? Add one via "Manage Parties".
              </Typography>
            </Box>
          ) : (
            <>
              <Typography sx={{ mb: 1.5, fontSize: 12.5, color: brand.slate, fontWeight: 600 }}>
                {rows.length} record(s) for {party}.
              </Typography>
              <DataTable columns={columns} rows={rows} empty={loading ? "Loading..." : `No entries found for ${party}`} totalsRow={totalsRow} />
            </>
          )}
        </SectionCard>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
