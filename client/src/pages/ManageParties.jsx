import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Card, CardContent, Typography, Button, TextField, Grid, MenuItem, IconButton, Chip,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { FaUsersCog } from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import { SectionCard, DataTable, money } from "../components/CashBook/ui";
import { getParties, addParty, updateParty, deleteParty } from "../api/ledgerApi";
import { useToast } from "../utils/useToast";
import { brand, gradients } from "../theme";

const EMPTY = { name: "", type: "Vendor", contact: "", openingBalance: "", remarks: "" };
const TYPES = ["Vendor", "Contractor", "Customer", "Employee", "Other"];

export default function ManageParties() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();

  const [formData, setFormData] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [parties, setParties] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    try {
      const res = await getParties();
      setParties(res.data || []);
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
    if (!formData.name.trim()) return showToast("Party name is required", "error");

    setSaving(true);
    try {
      if (editId) {
        await updateParty(editId, formData);
        showToast("Party updated successfully", "success");
      } else {
        await addParty(formData);
        showToast("Party added successfully", "success");
      }
      resetForm();
      load();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Error saving party", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    if (!row.manual) {
      showToast("This party comes from Bills/Receipts automatically and can't be edited here", "error");
      return;
    }
    setEditId(row.id);
    setFormData({
      name: row.name || "",
      type: row.type || "Vendor",
      contact: row.contact || "",
      openingBalance: row.openingBalance || "",
      remarks: row.remarks || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteParty(confirmDelete);
      showToast("Party deleted successfully", "success");
      if (editId === confirmDelete) resetForm();
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Error deleting party", "error");
    } finally {
      setConfirmDelete(null);
    }
  };

  const listColumns = [
    { key: "name", label: "Party Name" },
    { key: "type", label: "Type", render: (r) => r.type || (r.manual ? "Other" : "—") },
    { key: "contact", label: "Contact" },
    { key: "openingBalance", label: "Opening Balance", align: "right", render: (r) => (r.openingBalance ? money(r.openingBalance) : "") },
    {
      key: "source", label: "Source", align: "center",
      render: (r) => <Chip size="small" label={r.manual ? "Manual" : "Auto (Bills/Receipts)"} color={r.manual ? "primary" : "default"} />,
    },
    {
      key: "actions", label: "Actions", align: "center",
      render: (r) => r.manual ? (
        <>
          <IconButton size="small" onClick={() => handleEdit(r)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => setConfirmDelete(r.id)}><DeleteIcon fontSize="small" /></IconButton>
        </>
      ) : "—",
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
          <FaUsersCog style={{ marginRight: 4 }} />{editId ? "EDIT PARTY" : "PARTY MASTER"}
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>
          {editId ? "Edit Party" : "Manage Parties"}
        </Typography>
        <Typography color="text.secondary" mb={3}>
          Add vendors, contractors or customers here for the Party Ledger. Names already used in Bills
          or Cash Book Receipts show up automatically and don't need to be added again.
        </Typography>

        <Card elevation={4} sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 3.5 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={5}>
                <TextField fullWidth label="Party Name" name="name" value={formData.name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth select label="Type" name="type" value={formData.type} onChange={handleChange}>
                  {TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Contact" name="contact" value={formData.contact} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="number" label="Opening Balance" name="openingBalance" value={formData.openingBalance} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField fullWidth label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
              {editId && (
                <Button variant="outlined" color="inherit" onClick={resetForm}>Cancel Edit</Button>
              )}
              <Button
                variant="outlined" color="inherit" startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/ledger/party")}
              >
                Back
              </Button>
              <Button
                variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={handleSave}
                sx={{ background: gradients.brand }}
              >
                {saving ? "Saving..." : editId ? "Update Party" : "Save Party"}
              </Button>
            </Box>
          </CardContent>
        </Card>

        <SectionCard title="All Parties">
          <DataTable columns={listColumns} rows={parties} empty="No parties yet" />
        </SectionCard>
      </Box>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Party?"
        message="This party will be permanently removed from the Party Master."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
      {ToastUI}
    </MainLayout>
  );
}
