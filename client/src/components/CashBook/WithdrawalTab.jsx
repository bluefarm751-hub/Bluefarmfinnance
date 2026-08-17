import { useEffect, useState } from "react";
import { Box, Button, Grid, TextField, Typography, IconButton, LinearProgress } from "@mui/material";
import { FaTrashAlt, FaFileExcel, FaPrint } from "react-icons/fa";
import { SectionCard, DataTable, money, today } from "./ui";
import { getWithdrawals, addWithdrawal, deleteWithdrawal } from "../../api/cashbookApi";
import { exportExcel } from "../../utils/exportExcel";
import { printDocument, tableHtml } from "../../utils/print";
import { brand } from "../../theme";
import DateFieldDMY from "../DateFieldDMY";
import ConfirmDialog from "../ConfirmDialog";
import FarmSourceBadge from "../FarmSourceBadge";

export default function WithdrawalTab({ summary, onChanged, showToast }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ entryDate: today(), voucherNo: "", chequeNo: "", amount: "", withdrawnBy: "", remarks: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    try {
      const res = await getWithdrawals();
      setRows(res.data || []);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => { load(); }, []);

  const limit = summary?.safeLimit || 500000;
  const inHand = Number(summary?.cashInHand || 0);
  const usage = Math.min(100, (inHand / limit) * 100);

  const submit = async () => {
    if (!Number(form.amount)) return showToast("Amount is required", "error");
    try {
      const res = await addWithdrawal({ ...form, amount: Number(form.amount) });
      showToast(res.data.message, "success");
      setForm({ ...form, voucherNo: "", chequeNo: "", amount: "", withdrawnBy: "", remarks: "" });
      load();
      onChanged?.();
    } catch (e) {
      showToast(e.response?.data?.message || "Error recording withdrawal", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWithdrawal(deleteTarget.id);
      showToast("Withdrawal deleted successfully", "success");
      setDeleteTarget(null);
      load();
      onChanged?.();
    } catch (e) {
      showToast("Error deleting withdrawal", "error");
    }
  };

  const columns = [
    { key: "__sno", label: "S No", render: (_r, i) => i + 1 },
    { key: "entryDate", label: "Date" },
    { key: "voucherNo", label: "Voucher No" },
    { key: "chequeNo", label: "Cheque No" },
    { key: "withdrawnBy", label: "Withdrawn By" },
    { key: "remarks", label: "Remarks" },
    { key: "amount", label: "Amount", align: "right", render: (r) => money(r.amount) },
    {
      key: "actions", label: "", align: "center",
      render: (r) => (
        <IconButton size="small" onClick={() => setDeleteTarget(r)} sx={{ color: brand.danger }}>
          <FaTrashAlt size={12} />
        </IconButton>
      ),
    },
  ];
  const exportCols = columns.slice(0, 7).map((c) => ({ key: c.key, label: c.label }));
  const total = rows.reduce((t, r) => t + Number(r.amount || 0), 0);

  return (
    <>
      <SectionCard title="Cash Withdrawal from Bank">
        <FarmSourceBadge type="CONTRA" />
        <Typography sx={{ mb: 2, fontSize: 12.5, color: brand.slate, fontWeight: 600 }}>
          Cash withdrawn from the shared bank account is kept in the office safe. Each withdrawal reduces the
          Bank Balance and increases Cash in Hand. Safe limit: {money(limit)}.
          This is posted as a Contra (C#) entry — Receipt side Cash, Payment side Bank.
        </Typography>

        <Box sx={{ mb: 2.5, p: 2, borderRadius: 3, background: brand.panel }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.8 }}>
            <Typography fontSize={12.5} fontWeight={800} color={brand.ink}>Office Safe Usage</Typography>
            <Typography fontSize={12.5} fontWeight={800} color={usage > 90 ? brand.danger : brand.blueDeep}>
              {money(inHand)} / {money(limit)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={usage}
            sx={{
              height: 10, borderRadius: 6, background: "rgba(15,76,129,0.12)",
              "& .MuiLinearProgress-bar": { background: usage > 90 ? brand.danger : brand.blueDeep, borderRadius: 6 },
            }}
          />
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <DateFieldDMY label="Date" size="small" value={form.entryDate}
              onChange={(e) => setForm({ ...form, entryDate: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="Voucher No" value={form.voucherNo}
              onChange={(e) => setForm({ ...form, voucherNo: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="Cheque No" value={form.chequeNo}
              onChange={(e) => setForm({ ...form, chequeNo: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" type="number" label="Amount" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="Withdrawn By" value={form.withdrawnBy}
              onChange={(e) => setForm({ ...form, withdrawnBy: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Remarks" value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button fullWidth variant="contained" onClick={submit}
              sx={{ height: 40, background: brand.blueDeep, fontWeight: 800, "&:hover": { background: brand.navy } }}>
              Withdraw Cash
            </Button>
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard
        title="Withdrawal History"
        action={
          <>
            <Button size="small" variant="outlined" startIcon={<FaFileExcel />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
              onClick={() => exportExcel("Cash Withdrawal Report", exportCols, rows)}>Excel</Button>
            <Button size="small" variant="outlined" startIcon={<FaPrint />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
              onClick={() => printDocument({ title: "Cash Withdrawal Report", subtitle: "Cash Book", landscape: true, bodyHtml: tableHtml(exportCols, rows) })}>Print</Button>
          </>
        }
      >
        <DataTable columns={columns} rows={rows} empty="No withdrawals recorded"
          totalsRow={{ __sno: "TOTAL", amount: money(total) }} />
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
