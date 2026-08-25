import { useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, Typography } from "@mui/material";
import { FaFileExcel, FaFilePdf, FaPrint, FaBook } from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import DateFieldDMY from "../components/DateFieldDMY";
import { SectionCard, DataTable, money, signedMoney } from "../components/CashBook/ui";
import { getGeneralLedger } from "../api/ledgerApi";
import { exportExcel } from "../utils/exportExcel";
import { printDocument, tableHtml } from "../utils/print";
import { useToast } from "../utils/useToast";
import { brand } from "../theme";

const columns = [
  { key: "date", label: "Date" },
  { key: "voucherNo", label: "Voucher No" },
  { key: "party", label: "Party" },
  { key: "description", label: "Description" },
  { key: "source", label: "Source" },
  { key: "debit", label: "Debit", align: "right", render: (r) => (r.debit ? money(r.debit) : "") },
  { key: "credit", label: "Credit", align: "right", render: (r) => (r.credit ? money(r.credit) : "") },
  { key: "balance", label: "Balance", align: "right", render: (r) => signedMoney(r.balance) },
];

export default function GeneralLedger() {
  const { ToastUI } = useToast();
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
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filters]);

  const totals = useMemo(() => {
    let debit = 0, credit = 0;
    rows.forEach((r) => { debit += Number(r.debit || 0); credit += Number(r.credit || 0); });
    return { debit, credit, balance: debit - credit };
  }, [rows]);

  const subtitle = `${filters.from || "Start"} to ${filters.to || "Today"} · ${farm}`;
  const totalsRow = rows.length
    ? { description: "TOTAL", debit: money(totals.debit), credit: money(totals.credit), balance: signedMoney(totals.balance) }
    : null;

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 3 }}>
        <Typography variant="h4" fontWeight="bold" mb={0.5}>General Ledger</Typography>
        <Typography color="text.secondary" mb={3}>
          Every Debit / Credit entry for {farm}, in chronological order with a running balance. Payable and Paid bills are both credits here and therefore reduce the Simple/General Ledger balance.
        </Typography>

        <SectionCard
          title={<><FaBook style={{ marginRight: 8, verticalAlign: -2 }} />General Ledger — {farm}</>}
          action={
            <>
              <Button size="small" variant="outlined" startIcon={<FaFileExcel />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
                onClick={() => exportExcel("General Ledger", columns, rows)}>Excel</Button>
              <Button size="small" variant="outlined" startIcon={<FaFilePdf />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
                onClick={() => printDocument({ title: "General Ledger", subtitle: `${subtitle} — choose "Save as PDF"`, landscape: true, bodyHtml: tableHtml(columns, rows) })}>PDF</Button>
              <Button size="small" variant="outlined" startIcon={<FaPrint />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
                onClick={() => printDocument({ title: "General Ledger", subtitle, landscape: true, bodyHtml: tableHtml(columns, rows) })}>Print</Button>
            </>
          }
        >
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={3}>
              <DateFieldDMY label="From" size="small" value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <DateFieldDMY label="To" size="small" value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </Grid>
          </Grid>

          <Typography sx={{ mb: 1.5, fontSize: 12.5, color: brand.slate, fontWeight: 600 }}>
            Debit = money received (bills paid to the farm, receipts). Credit = money paid out (including both Paid and Payable bills,
            HQ remittances). Payable bills therefore reduce the Simple/General Ledger balance. Bills, receipts, bank deposits and remittances are pulled in automatically —
            add anything else from "Add Ledger Entry". {rows.length} record(s).
          </Typography>

          <DataTable columns={columns} rows={rows} empty={loading ? "Loading..." : "No ledger entries for the selected range"} totalsRow={totalsRow} />
        </SectionCard>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
