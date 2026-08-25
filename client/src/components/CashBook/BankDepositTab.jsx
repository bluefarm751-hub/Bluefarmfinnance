import { useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, IconButton, TextField, Typography } from "@mui/material";
import { FaPlus, FaTrashAlt, FaFileExcel, FaPrint } from "react-icons/fa";
import MenuItem from "@mui/material/MenuItem";
import { SectionCard, DataTable, money, today } from "./ui";
import { getBankDeposits, addBankDeposit, deleteBankDeposit } from "../../api/cashbookApi";
import { exportExcel } from "../../utils/exportExcel";
import { printDocument, tableHtml } from "../../utils/print";
import { brand } from "../../theme";
import DateFieldDMY from "../DateFieldDMY";
import ConfirmDialog from "../ConfirmDialog";
import FarmSourceBadge from "../FarmSourceBadge";

export default function BankDepositTab({ summary, onChanged, showToast }) {
  const [rows, setRows] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const SOURCES = ["Milk Sale", "Culling of Animals", "Other Income"];
  const [form, setForm] = useState({ entryDate: today(), voucherNo: "", amount: "", depositedBy: "", head: "Milk Sale", remarks: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filters, setFilters] = useState({ from: "", to: "" });

  const load = async () => { try { setRows((await getBankDeposits(filters)).data || []); } catch(e) { console.log(e); } };
  useEffect(() => { load(); }, [filters]);

  const totalDeposited = useMemo(() => rows.reduce((t, r) => t + Number(r.amount || 0), 0), [rows]);

  const columns = [
    { key: "entryDate", label: "Date" }, { key: "voucherNo", label: "Voucher No" },
    { key: "depositedBy", label: "Deposited By" },
    { key: "head", label: "Head", render: (r) => (<Box component="span" sx={{ fontSize: 11, fontWeight: 800, px: 1.2, py: 0.4, borderRadius: 5, background: "rgba(15,76,129,0.10)", color: brand.blueDeep }}>{r.head || "—"}</Box>) },
    { key: "amount", label: "Amount", align: "right", render: (r) => money(r.amount) },
    { key: "remarks", label: "Remarks" },
    { key: "actions", label: "", align: "center",
      render: (r) => <IconButton size="small" onClick={() => setDeleteTarget(r)} sx={{ color: brand.danger }}><FaTrashAlt size={12} /></IconButton> },
  ];

  const submit = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return showToast("Valid amount is required", "error");
    try {
      await addBankDeposit({ entryDate: form.entryDate, voucherNo: form.voucherNo, amount: amt, depositedBy: form.depositedBy, head: form.head, remarks: form.remarks });
      showToast("Bank deposit recorded", "success");
      setForm({ ...form, voucherNo: "", amount: "", depositedBy: "", head: "Milk Sale", remarks: "" }); setShowForm(false); load(); onChanged?.();
    } catch (e) { showToast(e.response?.data?.message || "Error", "error"); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteBankDeposit(deleteTarget.id); showToast("Deleted", "success"); setDeleteTarget(null); load(); onChanged?.(); }
    catch (e) { showToast(e.response?.data?.message || "Error", "error"); }
  };

  const exportCols = [{ key: "entryDate", label: "Date" },{ key: "voucherNo", label: "Voucher No" },{ key: "depositedBy", label: "Deposited By" },{ key: "head", label: "Head" },{ key: "amount", label: "Amount" },{ key: "remarks", label: "Remarks" }];

  return (<>
    <SectionCard title="Bank Deposit — Cash from Safe → Shared Bank Account" action={<>
      <Button size="small" variant="contained" startIcon={<FaPlus />} onClick={() => setShowForm(s => !s)}
        sx={{ background: brand.gold, color: brand.ink, fontWeight: 800, "&:hover": { background: brand.goldDark, color: "#fff" } }}>Add Deposit</Button>
      <Button size="small" variant="outlined" startIcon={<FaFileExcel />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
        onClick={() => exportExcel("Bank Deposits", exportCols, rows)}>Excel</Button>
      <Button size="small" variant="outlined" startIcon={<FaPrint />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
        onClick={() => printDocument({ title: "Bank Deposits", subtitle: "Cash → Bank", landscape: true, bodyHtml: tableHtml(exportCols, rows) })}>Print</Button>
    </>}>
      <FarmSourceBadge type="CONTRA" />
      <Box sx={{ display: "flex", gap: 3, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ borderRadius: 3, px: 3, py: 1.5, background: "linear-gradient(135deg, #2FBF71 0%, #1B8A50 100%)", color: "#fff", minWidth: 200 }}>
          <Typography fontSize={12}>Total Deposited</Typography><Typography fontSize={22} fontWeight={800}>{money(totalDeposited)}</Typography></Box>
        <Box sx={{ borderRadius: 3, px: 3, py: 1.5, background: "linear-gradient(135deg, #F0574D 0%, #C0392B 100%)", color: "#fff", minWidth: 200 }}>
          <Typography fontSize={12}>Cash in Hand</Typography><Typography fontSize={22} fontWeight={800}>{money(summary?.cashInHand || 0)}</Typography></Box>
        <Box sx={{ borderRadius: 3, px: 3, py: 1.5, background: "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)", color: "#fff", minWidth: 200 }}>
          <Typography fontSize={12}>Cash in Bank</Typography><Typography fontSize={22} fontWeight={800}>{money(summary?.cashInBank || 0)}</Typography></Box>
      </Box>
      <Typography sx={{ mb: 1.5, fontSize: 12.5, color: brand.slate, fontWeight: 600 }}>
        Record cash taken from office safe and deposited into shared bank account. Increases Cash in Bank, decreases Cash in Hand.
        This is posted as a Contra (C#) entry — Receipt side Bank, Payment side Cash.
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={3}><DateFieldDMY label="From" size="small" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} /></Grid>
        <Grid item xs={12} sm={3}><DateFieldDMY label="To" size="small" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} /></Grid>
      </Grid>
      {showForm && <Box sx={{ p: 2, mb: 2, borderRadius: 3, border: `1.5px dashed ${brand.gold}`, background: "rgba(212,175,55,0.06)" }}>
        <Typography fontWeight={800} sx={{ mb: 1.5, color: brand.ink }}>Record Bank Deposit</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}><DateFieldDMY label="Date" size="small" value={form.entryDate} onChange={e => setForm({...form, entryDate: e.target.value})} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Voucher / Deposit Slip No" value={form.voucherNo} onChange={e => setForm({...form, voucherNo: e.target.value})} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" type="number" label="Amount (Rs.)" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Deposited By" value={form.depositedBy} onChange={e => setForm({...form, depositedBy: e.target.value})} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" select label="Head / Source" value={form.head} onChange={e => setForm({...form, head: e.target.value})}>{SOURCES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Remarks" value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} /></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={submit} sx={{ background: brand.blueDeep, fontWeight: 800, "&:hover": { background: brand.navy } }}>Save Deposit</Button></Grid>
        </Grid></Box>}
      <DataTable columns={columns} rows={rows} empty="No bank deposits yet" totalsRow={{ entryDate: "TOTAL", amount: money(totalDeposited) }} plainRows />
    </SectionCard>
    <ConfirmDialog open={!!deleteTarget} title="Delete Deposit?" message="This will decrease Cash in Bank and increase Cash in Hand." confirmLabel="Delete" cancelLabel="Cancel" onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
  </>);
}
