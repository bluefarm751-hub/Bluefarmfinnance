import { useEffect, useState } from "react";
import { Box, Button, Grid, MenuItem, TextField, Typography, IconButton } from "@mui/material";
import { FaTrashAlt, FaFileExcel, FaPrint } from "react-icons/fa";
import { SectionCard, DataTable, money, today } from "../CashBook/ui";
import { getTRs, addTR, updateTR, deleteTR } from "../../api/cashbookApi";
import { exportExcel } from "../../utils/exportExcel";
import { printDocument, tableHtml } from "../../utils/print";
import { brand } from "../../theme";
import DateFieldDMY from "../DateFieldDMY";
import ConfirmDialog from "../ConfirmDialog";

export default function TRTab({ onChanged, showToast }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ entryDate: today(), description: "", issuedTo: "", amount: "", authority: "", status: "Not Cleared" });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      const res = await getTRs();
      setRows(res.data || []);
    } catch (e) { console.log(e); }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!Number(form.amount)) return showToast("Amount is required", "error");
    if (!form.issuedTo.trim()) return showToast("Issued To is required", "error");
    try {
      await addTR({ ...form, amount: Number(form.amount) });
      showToast("Temporary receipt issued successfully", "success");
      setForm({ ...form, description: "", issuedTo: "", amount: "", authority: "" });
      load();
      onChanged?.();
    } catch (e) {
      showToast(e.response?.data?.message || "Error issuing TR", "error");
    }
  };

  const changeStatus = async (r, status) => {
    try {
      await updateTR(r.id, { ...r, entryDate: r.entryDate, status });
      showToast(`TR marked ${status}`, "success");
      load();
      onChanged?.();
    } catch (e) {
      showToast("Error updating TR", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTR(deleteTarget.id);
      showToast("Temporary receipt deleted successfully", "success");
      setDeleteTarget(null);
      load();
      onChanged?.();
    } catch (e) { showToast("Error deleting TR", "error"); }
  };

  const columns = [
    { key: "sNo", label: "S No" },
    { key: "entryDate", label: "Date" },
    { key: "description", label: "Description" },
    { key: "issuedTo", label: "Issued To" },
    { key: "amount", label: "Amount", align: "right", render: (r) => money(r.amount) },
    { key: "authority", label: "Authority" },
    {
      key: "status", label: "Status",
      render: (r) => (
        <TextField
          select size="small" value={r.status || "Not Cleared"}
          onChange={(e) => changeStatus(r, e.target.value)}
          sx={{
            minWidth: 140,
            "& .MuiOutlinedInput-root": {
              fontSize: 12.5, fontWeight: 800,
              color: r.status === "Cleared" ? brand.success : brand.danger,
            },
          }}
        >
          <MenuItem value="Cleared">Cleared</MenuItem>
          <MenuItem value="Not Cleared">Not Cleared</MenuItem>
        </TextField>
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

  const exportCols = [
    { key: "sNo", label: "S No" }, { key: "entryDate", label: "Date" },
    { key: "description", label: "Description" }, { key: "issuedTo", label: "Issued To" },
    { key: "amount", label: "Amount" }, { key: "authority", label: "Authority" },
    { key: "status", label: "Status" },
  ];

  const outstanding = rows.filter((r) => r.status !== "Cleared").reduce((t, r) => t + Number(r.amount || 0), 0);
  const total = rows.reduce((t, r) => t + Number(r.amount || 0), 0);

  return (
    <>
      <SectionCard title="Issue Temporary Receipt (Cash Advance)">
        <Typography sx={{ mb: 2, fontSize: 12.5, color: brand.slate, fontWeight: 600 }}>
          A TR is a cash advance issued to personnel. It does NOT create a Payment Side entry — the amount is
          only carried in Daily Closing until the TR is cleared (bills submitted or cash returned).
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <DateFieldDMY label="Date" size="small" value={form.entryDate}
              onChange={(e) => setForm({ ...form, entryDate: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="Issued To" value={form.issuedTo}
              onChange={(e) => setForm({ ...form, issuedTo: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField fullWidth size="small" type="number" label="Amount" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="Authority" value={form.authority}
              onChange={(e) => setForm({ ...form, authority: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" select label="Status" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <MenuItem value="Not Cleared">Not Cleared</MenuItem>
              <MenuItem value="Cleared">Cleared</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button fullWidth variant="contained" onClick={submit}
              sx={{ height: 40, background: brand.blueDeep, fontWeight: 800, "&:hover": { background: brand.navy } }}>
              Issue TR
            </Button>
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard
        title={`Temporary Receipts — Outstanding ${money(outstanding)}`}
        action={
          <>
            <Button size="small" variant="outlined" startIcon={<FaFileExcel />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
              onClick={() => exportExcel("Temporary Receipt Report", exportCols, rows)}>Excel</Button>
            <Button size="small" variant="outlined" startIcon={<FaPrint />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
              onClick={() => printDocument({ title: "Temporary Receipt Report", subtitle: "Cash Book", landscape: true, bodyHtml: tableHtml(exportCols, rows) })}>Print</Button>
          </>
        }
      >
        <DataTable columns={columns} rows={rows} empty="No temporary receipts issued"
          totalsRow={{ sNo: "TOTAL", amount: money(total), status: `Outstanding ${money(outstanding)}` }}
          plainRows />
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
