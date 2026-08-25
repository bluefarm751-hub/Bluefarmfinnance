import { useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, MenuItem, TextField, Typography } from "@mui/material";
import { FaFileExcel, FaFilePdf, FaPrint } from "react-icons/fa";
import { SectionCard, DataTable, money } from "./ui";
import {
  getReceipts, getPayments, getWithdrawals, getTRs, getClosings, getStatement, getHoRemittances, getBankDeposits,
} from "../../api/cashbookApi";
import { getFinanceHeads } from "../../api/financeApi";
import { exportExcel } from "../../utils/exportExcel";
import { printDocument, tableHtml } from "../../utils/print";
import { brand } from "../../theme";
import DateFieldDMY from "../DateFieldDMY";

const REPORTS = [
  { key: "receipt", label: "Receipt Report" },
  { key: "payment", label: "Payment Report" },
  { key: "withdrawal", label: "Cash Withdrawal Report" },
  { key: "bankdeposit", label: "Bank Deposit Report" },
  { key: "ho", label: "HQ Remittance Report" },
  { key: "tr", label: "Temporary Receipt Report" },
  { key: "closing", label: "Daily Closing Report" },
  { key: "statement", label: "Cash Book Statement" },
  { key: "datewise", label: "Date-wise Report" },
  { key: "headwise", label: "Head-wise Report" },
  { key: "farmwise", label: "Farm-wise Report" },
];

const sideCols = [
  { key: "date", label: "Date" },
  { key: "voucherNo", label: "Voucher No" },
  { key: "party", label: "Contractor / Party" },
  { key: "description", label: "Description" },
  { key: "head", label: "Head" },
  { key: "farm", label: "Farm" },
  { key: "sourceTag", label: "Source" },
  { key: "cash", label: "Cash" },
  { key: "bank", label: "Bank" },
];

export default function ReportsTab() {
  const [type, setType] = useState("receipt");
  const [filters, setFilters] = useState({ from: "", to: "", farm: "", head: "" });
  const [heads, setHeads] = useState([]);
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState(sideCols);

  useEffect(() => { getFinanceHeads().then((r) => setHeads(r.data || [])).catch(() => {}); }, []);

  const load = async () => {
    const p = filters;
    const fmt = (list) => list.map((r) => ({ ...r, cash: Number(r.cash || 0), bank: Number(r.bank || 0) }));

    if (type === "receipt" || type === "payment") {
      const res = type === "receipt" ? await getReceipts(p) : await getPayments(p);
      setColumns(sideCols);
      setRows(fmt(res.data || []));
      return;
    }

    if (type === "bankdeposit") {
      const res = await getBankDeposits(p);
      setColumns([
        { key: "entryDate", label: "Date" }, { key: "voucherNo", label: "Voucher No" },
        { key: "depositedBy", label: "Deposited By" }, { key: "farm", label: "Farm" },
        { key: "sourceTag", label: "Source" },
        { key: "amount", label: "Amount" }, { key: "remarks", label: "Remarks" },
      ]);
      setRows(res.data || []);
      return;
    }

    if (type === "ho") {
      const res = await getHoRemittances(p);
      setColumns([
        { key: "entryDate", label: "Date" }, { key: "voucherNo", label: "Voucher No" },
        { key: "bankRef", label: "Bank Ref / UTR" }, { key: "transferMode", label: "Mode" },
        { key: "amount", label: "Amount" }, { key: "remarks", label: "Remarks" },
      ]);
      setRows(res.data || []);
      return;
    }

    if (type === "withdrawal") {
      const res = await getWithdrawals(p);
      setColumns([
        { key: "entryDate", label: "Date" }, { key: "voucherNo", label: "Voucher No" },
        { key: "chequeNo", label: "Cheque No" }, { key: "withdrawnBy", label: "Withdrawn By" },
        { key: "farm", label: "Farm" }, { key: "sourceTag", label: "Source" }, { key: "amount", label: "Amount" },
      ]);
      setRows(res.data || []);
      return;
    }

    if (type === "tr") {
      const res = await getTRs(p);
      setColumns([
        { key: "sNo", label: "S No" }, { key: "entryDate", label: "Date" },
        { key: "description", label: "Description" }, { key: "issuedTo", label: "Issued To" },
        { key: "amount", label: "Amount" }, { key: "authority", label: "Authority" },
        { key: "status", label: "Status" },
      ]);
      setRows(res.data || []);
      return;
    }

    if (type === "closing") {
      const res = await getClosings(p);
      setColumns([
        { key: "closingDate", label: "Date" }, { key: "totalWithdrawn", label: "Withdrawn" },
        { key: "cashBills", label: "Cash Bills" }, { key: "trIssued", label: "TR Issued" },
        { key: "expectedCash", label: "Expected" }, { key: "actualCash", label: "Actual" },
        { key: "difference", label: "Difference" }, { key: "status", label: "Status" },
      ]);
      setRows(res.data || []);
      return;
    }

    // statement / date-wise / head-wise / farm-wise are all built from the statement
    const res = await getStatement(p);
    const st = res.data.statement || [];

    if (type === "statement") {
      setColumns([
        { key: "date", label: "Date" }, { key: "type", label: "Type" },
        { key: "voucherNo", label: "Voucher No" }, { key: "party", label: "Party" },
        { key: "head", label: "Head" }, { key: "farm", label: "Farm" },
        { key: "sourceTag", label: "Source" },
        { key: "cash", label: "Cash" }, { key: "bank", label: "Bank" },
        { key: "cashBalance", label: "Cash Balance" }, { key: "bankBalance", label: "Bank Balance" },
      ]);
      setRows(st);
      return;
    }

    const groupBy = type === "datewise" ? "date" : type === "headwise" ? "head" : "farm";
    const map = {};
    st.forEach((r) => {
      const k = r[groupBy] || "—";
      map[k] = map[k] || { group: k, receiptCash: 0, receiptBank: 0, paymentCash: 0, paymentBank: 0 };
      if (r.type === "Receipt") {
        map[k].receiptCash += Number(r.cash || 0);
        map[k].receiptBank += Number(r.bank || 0);
      } else {
        map[k].paymentCash += Number(r.cash || 0);
        map[k].paymentBank += Number(r.bank || 0);
      }
    });
    const grouped = Object.values(map).map((g) => ({
      ...g,
      receipts: g.receiptCash + g.receiptBank,
      payments: g.paymentCash + g.paymentBank,
      balance: g.receiptCash + g.receiptBank - g.paymentCash - g.paymentBank,
    }));

    setColumns([
      { key: "group", label: groupBy === "date" ? "Date" : groupBy === "head" ? "Head" : "Farm" },
      { key: "receiptCash", label: "Receipt Cash" }, { key: "receiptBank", label: "Receipt Bank" },
      { key: "paymentCash", label: "Payment Cash" }, { key: "paymentBank", label: "Payment Bank" },
      { key: "receipts", label: "Total Receipts" }, { key: "payments", label: "Total Payments" },
      { key: "balance", label: "Balance" },
    ]);
    setRows(grouped);
  };

  useEffect(() => { load().catch((e) => console.log(e)); /* eslint-disable-next-line */ }, [type, filters]);

  const label = REPORTS.find((r) => r.key === type)?.label || "Report";

  const displayColumns = useMemo(
    () =>
      columns.map((c) => {
        const numeric = ["cash", "bank", "amount", "cashBalance", "bankBalance", "receipts", "payments",
          "balance", "receiptCash", "receiptBank", "paymentCash", "paymentBank", "totalWithdrawn",
          "cashBills", "trIssued", "expectedCash", "actualCash", "difference"].includes(c.key);
        return numeric ? { ...c, align: "right", render: (r) => money(r[c.key]) } : c;
      }),
    [columns]
  );

  const subtitle = `${filters.from || "Start"} to ${filters.to || "Today"}${filters.farm ? ` · ${filters.farm}` : " · Both Farms"}`;

  return (
    <SectionCard
      title={`Cash Reports — ${label}`}
      action={
        <>
          <Button size="small" variant="outlined" startIcon={<FaFileExcel />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
            onClick={() => exportExcel(label, columns, rows)}>Excel</Button>
          <Button size="small" variant="outlined" startIcon={<FaFilePdf />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
            onClick={() => printDocument({ title: label, subtitle: `${subtitle} — choose "Save as PDF"`, landscape: true, bodyHtml: tableHtml(columns, rows) })}>PDF</Button>
          <Button size="small" variant="outlined" startIcon={<FaPrint />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
            onClick={() => printDocument({ title: label, subtitle, landscape: true, bodyHtml: tableHtml(columns, rows) })}>Print</Button>
        </>
      }
    >
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={3}>
          <TextField fullWidth size="small" select label="Report Type" value={type} onChange={(e) => setType(e.target.value)}>
            {REPORTS.map((r) => <MenuItem key={r.key} value={r.key}>{r.label}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={2}>
          <DateFieldDMY label="From" size="small" value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </Grid>
        <Grid item xs={12} sm={2}>
          <DateFieldDMY label="To" size="small" value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </Grid>
        <Grid item xs={12} sm={2.5}>
          <TextField fullWidth size="small" select sx={{ minWidth: 150 }} label="Farm" value={filters.farm}
            onChange={(e) => setFilters({ ...filters, farm: e.target.value })}>
            <MenuItem value="">Both Farms</MenuItem>
            <MenuItem value="Blue Farm">Blue Farm</MenuItem>
            <MenuItem value="Blue Remounts">Blue Remounts</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={2.5}>
          <TextField fullWidth size="small" select sx={{ minWidth: 150 }} label="Head" value={filters.head}
            onChange={(e) => setFilters({ ...filters, head: e.target.value })}>
            <MenuItem value="">All Heads</MenuItem>
            {heads.map((h) => <MenuItem key={h.id} value={h.headName}>{h.headName}</MenuItem>)}
          </TextField>
        </Grid>
      </Grid>

      <Typography sx={{ mb: 1.5, fontSize: 12.5, color: brand.slate, fontWeight: 600 }}>
        All reports are generated automatically from Budget Allocation, Add Bills, Cash Withdrawal,
        Bank Deposit, HQ Remittance, Temporary Receipts and Daily Closing. {rows.length} record(s).
      </Typography>

      <DataTable columns={displayColumns} rows={rows} empty="No records for the selected filters" plainRows />
    </SectionCard>
  );
}
