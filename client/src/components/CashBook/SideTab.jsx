import { useEffect, useMemo, useState } from "react";
import { Box, Button, Grid, MenuItem, TextField, Typography, IconButton } from "@mui/material";
import { FaPlus, FaTrashAlt, FaFileExcel, FaPrint } from "react-icons/fa";
import { SectionCard, DataTable, money, today } from "./ui";
import { getReceipts, getPayments, addReceipt, deleteReceipt } from "../../api/cashbookApi";
import { getFinanceHeads } from "../../api/financeApi";
import { exportExcel } from "../../utils/exportExcel";
import { printDocument, tableHtml } from "../../utils/print";
import { brand } from "../../theme";
import DateFieldDMY from "../DateFieldDMY";
import ConfirmDialog from "../ConfirmDialog";

const SOURCES = ["Milk Sale", "Culling of Animals", "Other Income"];

/**
 * side = "receipt" | "payment"
 * Receipt side auto-picks Budget Allocations; Payment side auto-picks Add Bills.
 */
export default function SideTab({ side, onChanged, showToast, allowAdd = false }) {
  const isReceipt = side === "receipt";
  const canAdd = isReceipt && allowAdd;
  const [rows, setRows] = useState([]);
  const [heads, setHeads] = useState([]);
  const [filters, setFilters] = useState({ from: "", to: "", farm: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    entryDate: today(),
    voucherNo: "",
    party: "",
    description: "",
    head: "Milk Sale",
    source: "Milk Sale",
    mode: "Cash",
    amount: "",
  });
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    try {
      const res = isReceipt ? await getReceipts(filters) : await getPayments(filters);
      setRows(res.data || []);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    load();
    if (isReceipt) getFinanceHeads().then((r) => setHeads(r.data || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, side]);

  const totals = useMemo(
    () => ({
      cash: rows.reduce((t, r) => t + Number(r.cash || 0), 0),
      bank: rows.reduce((t, r) => t + Number(r.bank || 0), 0),
    }),
    [rows]
  );

  const columns = [
    { key: "date", label: "Date" },
    { key: "voucherNo", label: "Voucher No" },
    { key: "party", label: "Contractor / Party Name" },
    { key: "description", label: "Description" },
    { key: "head", label: "Head" },
    { key: "cash", label: "Cash", align: "right", render: (r) => (r.cash ? money(r.cash) : "-") },
    { key: "bank", label: "Bank", align: "right", render: (r) => (r.bank ? money(r.bank) : "-") },
    {
      key: "source",
      label: "Source",
      render: (r) => (
        <Box
          component="span"
          sx={{
            fontSize: 11,
            fontWeight: 800,
            px: 1.2,
            py: 0.4,
            borderRadius: 5,
            background: r.head === "C#" ? "rgba(162,75,209,0.14)" : r.auto ? "rgba(15,76,129,0.10)" : "rgba(212,175,55,0.18)",
            color: r.head === "C#" ? "#7A1FA2" : r.auto ? brand.blueDeep : brand.goldDark,
          }}
        >
          {r.sourceTag || r.source}
        </Box>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "center",
      render: (r) =>
        r.auto ? null : (
          <IconButton size="small" onClick={() => setDeleteTarget(r)} sx={{ color: brand.danger }}>
            <FaTrashAlt size={12} />
          </IconButton>
        ),
    },
  ];

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteReceipt(deleteTarget.rawId);
      showToast("Entry deleted successfully", "success");
      setDeleteTarget(null);
      load();
      onChanged?.();
    } catch (e) {
      showToast(e.response?.data?.message || "Error deleting entry", "error");
    }
  };

  const submit = async () => {
    if (!Number(form.amount)) return showToast("Amount is required", "error");
    try {
      await addReceipt({
        entryDate: form.entryDate,
        voucherNo: form.voucherNo,
        party: form.party,
        description: form.description,
        head: form.head,
        source: form.source,
        cash: form.mode === "Cash" ? Number(form.amount) : 0,
        bank: form.mode === "Bank" ? Number(form.amount) : 0,
      });
      showToast("Receipt added successfully", "success");
      setForm({ ...form, voucherNo: "", party: "", description: "", amount: "" });
      setShowForm(false);
      load();
      onChanged?.();
    } catch (e) {
      showToast(e.response?.data?.message || "Error adding receipt", "error");
    }
  };

  const exportCols = [
    { key: "date", label: "Date" },
    { key: "voucherNo", label: "Voucher No" },
    { key: "party", label: "Contractor / Party Name" },
    { key: "description", label: "Description" },
    { key: "head", label: "Head" },
    { key: "cash", label: "Cash" },
    { key: "bank", label: "Bank" },
    { key: "sourceTag", label: "Source" },
  ];
  const title = isReceipt ? "Receipt Side" : "Payment Side";

  return (
    <>
      <SectionCard
        title={`${title} — Blue Farm + Blue Remounts (shared bank account)`}
        action={
          <>
            {canAdd && (
              <Button
                size="small"
                variant="contained"
                startIcon={<FaPlus />}
                onClick={() => setShowForm((s) => !s)}
                sx={{ background: brand.gold, color: brand.ink, fontWeight: 800, "&:hover": { background: brand.goldDark, color: "#fff" } }}
              >
                Add Income
              </Button>
            )}
            <Button size="small" variant="outlined" startIcon={<FaFileExcel />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
              onClick={() => exportExcel(`${title}`, exportCols, rows)}>
              Excel
            </Button>
            <Button size="small" variant="outlined" startIcon={<FaPrint />} sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.6)" }}
              onClick={() => printDocument({ title, subtitle: "Cash Book", landscape: true, bodyHtml: tableHtml(exportCols, rows) })}>
              Print
            </Button>
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
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" select sx={{ minWidth: 160 }} label="Farm" value={filters.farm}
              onChange={(e) => setFilters({ ...filters, farm: e.target.value })}>
              <MenuItem value="">Both Farms</MenuItem>
              <MenuItem value="Blue Farm">Blue Farm</MenuItem>
              <MenuItem value="Blue Remounts">Blue Remounts</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        {showForm && canAdd && (
          <Box sx={{ p: 2, mb: 2, borderRadius: 3, border: `1.5px dashed ${brand.gold}`, background: "rgba(212,175,55,0.06)" }}>
            <Typography fontWeight={800} sx={{ mb: 1.5, color: brand.ink }}>
              Add Income (Milk Sale / Culling / Other)
            </Typography>
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
                <TextField fullWidth size="small" label="Contractor / Party Name" value={form.party}
                  onChange={(e) => setForm({ ...form, party: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" select label="Income Source" value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value, head: e.target.value })}>
                  {SOURCES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" select label="Head" value={form.head}
                  onChange={(e) => setForm({ ...form, head: e.target.value })}>
                  {[...SOURCES, ...heads.map((h) => h.headName)].map((h) => (
                    <MenuItem key={h} value={h}>{h}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" select label="Received In" value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Bank">Bank</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" type="number" label="Amount" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" label="Description" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" onClick={submit}
                  sx={{ background: brand.blueDeep, fontWeight: 800, "&:hover": { background: brand.navy } }}>
                  Save Receipt
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {!isReceipt && (
          <Typography sx={{ mb: 1.5, fontSize: 12.5, color: brand.slate, fontWeight: 600 }}>
            Every bill entered in Add Bills is posted here automatically — Cash bills in the Cash column,
            Bank transfer bills in the Bank column. No manual entry is required.
          </Typography>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          empty={isReceipt ? "No receipts yet" : "No payments yet — add bills in the Add Bill tab"}
          totalsRow={{ date: "TOTAL", cash: money(totals.cash), bank: money(totals.bank) }}
        />
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
