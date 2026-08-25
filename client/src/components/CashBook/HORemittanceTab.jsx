import { useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, IconButton, MenuItem, TextField, Typography } from "@mui/material";
import { FaPlus, FaTrashAlt, FaFileExcel, FaPrint, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import { SectionCard, DataTable, money, today } from "./ui";
import { getHoRemittances, addHoRemittance, updateHoRemittance, deleteHoRemittance } from "../../api/cashbookApi";
import { exportExcel } from "../../utils/exportExcel";
import { printDocument, tableHtml } from "../../utils/print";
import { brand } from "../../theme";
import DateFieldDMY from "../DateFieldDMY";
import ConfirmDialog from "../ConfirmDialog";

const TRANSFER_MODES = ["RTGS", "NEFT", "IMPS", "Cheque", "Online Transfer"];

export default function HORemittanceTab({ summary, onChanged, showToast }) {
  const [rows, setRows] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ entryDate: today(), voucherNo: "", bankRef: "", transferMode: "RTGS", amount: "", remarks: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filters, setFilters] = useState({ from: "", to: "" });

  const load = async () => { try { setRows((await getHoRemittances(filters)).data || []); } catch(e) { console.log(e); } };
  useEffect(() => { load(); }, [filters]);

  const totalRemitted = useMemo(() => rows.reduce((t, r) => t + Number(r.amount || 0), 0), [rows]);

  const columns = [
    { key: "entryDate", label: "Date" }, { key: "voucherNo", label: "Voucher No" },
    { key: "bankRef", label: "Bank Ref / UTR" },
    { key: "transferMode", label: "Mode", render: (r) => <Box component="span" sx={{ fontSize: 11, fontWeight: 800, px: 1.2, py: 0.4, borderRadius: 5, background: "rgba(15,76,129,0.10)", color: brand.blueDeep }}>{r.transferMode || "RTGS"}</Box> },
    { key: "amount", label: "Amount", align: "right", render: (r) => money(r.amount) },
    { key: "remarks", label: "Remarks" },
    { key: "actions", label: "", align: "center",
      render: (r) => (<>
        <IconButton size="small" onClick={() => { setEditId(r.id); setForm({ entryDate: r.entryDate || today(), voucherNo: r.voucherNo || "", bankRef: r.bankRef || "", transferMode: r.transferMode || "RTGS", amount: String(r.amount || ""), remarks: r.remarks || "" }); setShowForm(false); }} sx={{ color: brand.blueDeep, mr: 0.5 }}><FaEdit size={12} /></IconButton>
        <IconButton size="small" onClick={() => setDeleteTarget(r)} sx={{ color: brand.danger }}><FaTrashAlt size={12} /></IconButton>
      </>),
    },
  ];

  const submit = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return showToast("Valid amount is required", "error");
    try {
      if (editId) { await updateHoRemittance(editId, form); showToast("Updated", "success"); setEditId(null); }
      else { await addHoRemittance(form); showToast("HQ Remittance recorded", "success"); setShowForm(false); }
      setForm({ entryDate: today(), voucherNo: "", bankRef: "", transferMode: "RTGS", amount: "", remarks: "" }); load(); onChanged?.();
    } catch (e) { showToast(e.response?.data?.message || "Error", "error"); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteHoRemittance(deleteTarget.id); showToast("Deleted", "success"); setDeleteTarget(null); load(); onChanged?.(); }
    catch (e) { showToast(e.response?.data?.message || "Error", "error"); }
  };

  const exportCols = [{ key: "entryDate", label: "Date" },{ key: "voucherNo", label: "Voucher No" },{ key: "bankRef", label: "Bank Ref" },{ key: "transferMode", label: "Mode" },{ key: "amount", label: "Amount" },{ key: "remarks", label: "Remarks" }];

  return (<>
    <SectionCard title="HQ Remittance — Permanent Transfer to Head Office" action={<>
      <Button size="small" variant="contained" startIcon={<FaPlus />} onClick={() => setShowForm(s => !s)} disabled={!!editId}
        sx={{ background: brand.gold, color: brand.ink, fontWeight: 800, "&:hover": { background: brand.goldDark, color: "#fff" } }}>Add Remittance</Button>
      <Button size="small" variant="outlined" startIcon={<FaFileExcel />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }} onClick={() => exportExcel("HQ Remittances", exportCols, rows)}>Excel</Button>
      <Button size="small" variant="outlined" startIcon={<FaPrint />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }} onClick={() => printDocument({ title: "HQ Remittances", subtitle: "Head Office", landscape: true, bodyHtml: tableHtml(exportCols, rows) })}>Print</Button>
    </>}>
      <Box sx={{ display: "flex", gap: 3, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ borderRadius: 3, px: 3, py: 1.5, background: "linear-gradient(135deg, #F0574D 0%, #C0392B 100%)", color: "#fff", minWidth: 200 }}>
          <Typography fontSize={12}>Total Sent to HQ</Typography><Typography fontSize={22} fontWeight={800}>{money(totalRemitted)}</Typography></Box>
        <Box sx={{ borderRadius: 3, px: 3, py: 1.5, background: "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)", color: "#fff", minWidth: 200 }}>
          <Typography fontSize={12}>Bank Balance</Typography><Typography fontSize={22} fontWeight={800}>{money(summary?.cashInBank || 0)}</Typography></Box>
        <Box sx={{ borderRadius: 3, px: 3, py: 1.5, background: "linear-gradient(135deg, #A24BD1 0%, #7A1FA2 100%)", color: "#fff", minWidth: 200 }}>
          <Typography fontSize={12}>Total Entries</Typography><Typography fontSize={22} fontWeight={800}>{rows.length}</Typography></Box>
      </Box>
      <Typography sx={{ mb: 1.5, fontSize: 12.5, color: brand.slate, fontWeight: 600 }}>
        Money permanently transferred from shared bank account to Head Office. This is NOT an expense — it reduces Cash in Bank separately from Bills and Withdrawals.
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={3}><DateFieldDMY label="From" size="small" value={filters.from} onChange={e => setFilters({...filters, from: e.target.value})} /></Grid>
        <Grid item xs={12} sm={3}><DateFieldDMY label="To" size="small" value={filters.to} onChange={e => setFilters({...filters, to: e.target.value})} /></Grid>
      </Grid>
      {showForm && <Box sx={{ p: 2, mb: 2, borderRadius: 3, border: `1.5px dashed ${brand.gold}`, background: "rgba(212,175,55,0.06)" }}>
        <Typography fontWeight={800} sx={{ mb: 1.5, color: brand.ink }}>Record HQ Remittance</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}><DateFieldDMY label="Date" size="small" value={form.entryDate} onChange={e => setForm({...form, entryDate: e.target.value})} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Voucher No" value={form.voucherNo} onChange={e => setForm({...form, voucherNo: e.target.value})} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Bank Ref / UTR No" value={form.bankRef} onChange={e => setForm({...form, bankRef: e.target.value})} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" select label="Transfer Mode" value={form.transferMode} onChange={e => setForm({...form, transferMode: e.target.value})}>{TRANSFER_MODES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" type="number" label="Amount (Rs.)" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Remarks" value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} /></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={submit} sx={{ background: brand.blueDeep, fontWeight: 800, "&:hover": { background: brand.navy } }}>Save Remittance</Button></Grid>
        </Grid></Box>}
      {editId && <Box sx={{ p: 2, mb: 2, borderRadius: 3, border: `1.5px dashed ${brand.blueDeep}`, background: "rgba(15,76,129,0.04)" }}>
        <Typography fontWeight={800} sx={{ mb: 1.5, color: brand.ink }}>Edit HQ Remittance #{editId}</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}><DateFieldDMY label="Date" size="small" value={form.entryDate} onChange={e => setForm({...form, entryDate: e.target.value})} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Voucher No" value={form.voucherNo} onChange={e => setForm({...form, voucherNo: e.target.value})} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Bank Ref / UTR No" value={form.bankRef} onChange={e => setForm({...form, bankRef: e.target.value})} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" select label="Transfer Mode" value={form.transferMode} onChange={e => setForm({...form, transferMode: e.target.value})}>{TRANSFER_MODES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" type="number" label="Amount" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></Grid>
          <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="Remarks" value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} /></Grid>
          <Grid item xs={12}><Button variant="contained" onClick={submit} startIcon={<FaSave />} sx={{ background: brand.blueDeep, fontWeight: 800, mr: 1 }}>Update</Button><Button variant="outlined" onClick={() => { setEditId(null); setForm({ entryDate: today(), voucherNo: "", bankRef: "", transferMode: "RTGS", amount: "", remarks: "" }); }} startIcon={<FaTimes />}>Cancel</Button></Grid>
        </Grid></Box>}
      <DataTable columns={columns} rows={rows} empty="No HQ Remittances yet" totalsRow={{ entryDate: "TOTAL", amount: money(totalRemitted) }} plainRows />
    </SectionCard>
    <ConfirmDialog open={!!deleteTarget} title="Delete HQ Remittance?" message="This will increase Bank balance by the remitted amount." confirmLabel="Yes, Delete" cancelLabel="No" onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
  </>);
}
