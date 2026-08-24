import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, CardContent, Typography, Button, TextField, Grid, MenuItem, IconButton,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { FaPlusCircle } from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import DateFieldDMY from "../components/DateFieldDMY";
import ConfirmDialog from "../components/ConfirmDialog";
import { SectionCard, DataTable, money, today } from "../components/CashBook/ui";
import {
  getLedgerEntries, addLedgerEntry, updateLedgerEntry, deleteLedgerEntry, getParties,
} from "../api/ledgerApi";
import { useToast } from "../utils/useToast";
import { brand, gradients } from "../theme";

const EMPTY = {
  entryDate: today(),
  voucherNo: "",
  party: "",
  description: "",
  type: "Debit",
  amount: "",
  remarks: "",
};

export default function AddLedgerEntry() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();

  const [formData, setFormData] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState([]);
  const [parties, setParties] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    try {
      const [e, p] = await Promise.all([getLedgerEntries(), getParties()]);
      setEntries(e.data || []);
      setParties(p.data || []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData(EMPTY);
    setEditId(null);
  };

  const handleSave = async () => {
    if (!formData.entryDate) return showToast("Date is required", "error");
    if (!formData.description.trim()) return showToast("Description is required", "error");
    const amt = parseFloat(formData.amount);
    if (!amt || amt <= 0) return showToast("Enter a valid amount", "error");

    const payload = {
      entryDate: formData.entryDate,
      voucherNo: formData.voucherNo,
      party: formData.party,
      description: formData.description,
      remarks: formData.remarks,
      debit: formData.type === "Debit" ? amt : 0,
      credit: formData.type === "Credit" ? amt : 0,
    };

    setSaving(true);
    try {
      if (editId) {
        await updateLedgerEntry(editId, payload);
        showToast("Ledger entry updated successfully", "success");
      } else {
        await addLedgerEntry(payload);
        showToast("Ledger entry added successfully", "success");
      }
      resetForm();
      load();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Error saving entry", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditId(row.id);
    setFormData({
      entryDate: row.entryDate || today(),
      voucherNo: row.voucherNo || "",
      party: row.party || "",
      description: row.description || "",
      type: Number(row.debit) > 0 ? "Debit" : "Credit",
      amount: Number(row.debit) > 0 ? row.debit : row.credit,
      remarks: row.remarks || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteLedgerEntry(confirmDelete);
      showToast("Ledger entry deleted successfully", "success");
      if (editId === confirmDelete) resetForm();
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Error deleting entry", "error");
    } finally {
      setConfirmDelete(null);
    }
  };

  const listColumns = [
    { key: "entryDate", label: "Date" },
    { key: "voucherNo", label: "Voucher No" },
    { key: "party", label: "Party" },
    { key: "description", label: "Description" },
    { key: "debit", label: "Debit", align: "right", render: (r) => (r.debit ? money(r.debit) : "") },
    { key: "credit", label: "Credit", align: "right", render: (r) => (r.credit ? money(r.credit) : "") },
    {
      key: "actions", label: "Actions", align: "center",
      render: (r) => (
        <>
          <IconButton size="small" onClick={() => handleEdit(r)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => setConfirmDelete(r.id)}><DeleteIcon fontSize="small" /></IconButton>
        </>
      ),
    },
  ];

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 3 }}>
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>
          <FaPlusCircle style={{ marginRight: 4 }} />{editId ? "EDIT ENTRY" : "NEW LEDGER ENTRY"}
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>
          {editId ? "Edit Ledger Entry" : "Add Ledger Entry"}
        </Typography>
        <Typography color="text.secondary" mb={3}>
          Manual journal entry — for anything not already captured by Bills, Receipts, Bank Deposits or
          HQ Remittances (e.g. opening balances, adjustments). Appears in both the General Ledger and,
          if a party is chosen, that party's Ledger.
        </Typography>

        <Card elevation={4} sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 3.5 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <DateFieldDMY fullWidth label="Date" name="entryDate" value={formData.entryDate} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth label="Voucher No" name="voucherNo" value={formData.voucherNo} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth select label="Party (optional)" name="party" value={formData.party} onChange={handleChange}
                  helperText="Leave blank for a general-only entry"
                >
                  <MenuItem value="">— None —</MenuItem>
                  {parties.map((p) => <MenuItem key={p.name} value={p.name}>{p.name}</MenuItem>)}
                </TextField>
              </Grid>

              <Grid item xs={12}>
                <TextField fullWidth label="Description" name="description" value={formData.description} onChange={handleChange} />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField fullWidth select label="Type" name="type" value={formData.type} onChange={handleChange}>
                  <MenuItem value="Debit">Debit (money in / receivable)</MenuItem>
                  <MenuItem value="Credit">Credit (money out / payable)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="number" label="Amount" name="amount" value={formData.amount} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
              {editId && (
                <Button variant="outlined" color="inherit" onClick={resetForm}>Cancel Edit</Button>
              )}
              <Button
                variant="outlined" color="inherit" startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/ledger")}
              >
                Back
              </Button>
              <Button
                variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={handleSave}
                sx={{ background: gradients.brand }}
              >
                {saving ? "Saving..." : editId ? "Update Entry" : "Save Entry"}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <SectionCard title="Manual Ledger Entries">
          <DataTable columns={listColumns} rows={entries} empty="No manual entries added yet" />
        </SectionCard>
      </Box>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Ledger Entry?"
        message="This manual ledger entry will be permanently removed."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
      {ToastUI}
    </MainLayout>
  );
}
