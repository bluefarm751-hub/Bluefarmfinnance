import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogContent,
} from "@mui/material";

import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LockIcon from "@mui/icons-material/Lock";
import CloseIcon from "@mui/icons-material/Close";

import MainLayout from "../layouts/MainLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import DateFieldDMY from "../components/DateFieldDMY";
import { getFinanceHeads, updateFinanceHead, deleteFinanceHead } from "../api/financeApi";
import { useToast } from "../utils/useToast";
import { brand, gradients, tableHeadRowSx, tableBodyRowSx } from "../theme";

const EMPTY = {
  headName: "",
  amount: "",
  allocationDate: "",
  letterReference: "",
  remarks: "",
};

export default function EditHead() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();

  const [heads, setHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [lockedTarget, setLockedTarget] = useState(null);

  useEffect(() => {
    loadHeads();
  }, []);

  const loadHeads = async () => {
    setLoading(true);
    try {
      const res = await getFinanceHeads();
      setHeads(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (h) => {
    setEditing(h);
    setFormData({
      headName: h.headName || "",
      amount: h.amount ?? "",
      allocationDate: h.allocationDate || "",
      letterReference: h.letterReference || "",
      remarks: h.remarks || "",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.headName.trim()) {
      showToast("Head Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      await updateFinanceHead(editing.id, formData);
      showToast("Head updated successfully", "success");
      setEditing(null);
      loadHeads();
    } catch (err) {
      showToast(err.response?.data?.message || "Error updating head", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (h) => {
    const hasBills = Number(h.billCount ?? 0) > 0;
    if (hasBills) {
      setLockedTarget(h);
    } else {
      setDeleteTarget(h);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteFinanceHead(deleteTarget.id);
      showToast("Head deleted successfully", "success");
      setDeleteTarget(null);
      loadHeads();
    } catch (err) {
      showToast(err.response?.data?.message || "Error deleting head", "error");
    }
  };

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>MANAGE HEADS
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>
          Edit Head & Allocation
        </Typography>
        <Typography color="text.secondary" mb={3}>
          Update or remove an existing head, including its allocation date and letter reference.
        </Typography>

        <Card elevation={4} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={tableHeadRowSx}>
                    <TableCell sx={{ fontWeight: 800 }}>S No</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Head Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Spent</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Remaining</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Allocation Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Letter Ref.</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!loading && heads.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: brand.slate }}>
                        No heads found. Add one from the "Add Head" tab.
                      </TableCell>
                    </TableRow>
                  )}
                  {heads.map((h, i) => (
                    <TableRow key={h.id} hover sx={tableBodyRowSx(i)}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{h.headName}</TableCell>
                      <TableCell>Rs. {Number(h.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>Rs. {Number(h.spent || 0).toLocaleString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: brand.success }}>
                        Rs. {Number(h.remaining ?? h.amount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{h.allocationDate || "—"}</TableCell>
                      <TableCell>{h.letterReference || "—"}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEdit(h)} sx={{ color: brand.blueDeep }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(h)}
                          title={
                            Number(h.billCount ?? 0) > 0
                              ? "Locked — delete this head's bills first"
                              : "Delete head"
                          }
                          sx={{
                            color: Number(h.billCount ?? 0) > 0 ? brand.slate : brand.danger,
                            opacity: Number(h.billCount ?? 0) > 0 ? 0.6 : 1,
                          }}
                        >
                          {Number(h.billCount ?? 0) > 0 ? (
                            <LockIcon fontSize="small" />
                          ) : (
                            <DeleteIcon fontSize="small" />
                          )}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Box sx={{ mt: 3 }}>
          <Button variant="outlined" onClick={() => navigate("/finance")}>
            Back to Finance
          </Button>
        </Box>
      </Box>

      {/* Edit dialog */}
      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 4 } }}>
        <Box sx={{ background: gradients.brand, px: 3, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ color: "#fff", fontWeight: 800 }}>Edit Head</Typography>
          <IconButton size="small" onClick={() => setEditing(null)} sx={{ color: "#fff" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Head Name" name="headName" value={formData.headName} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth type="number" label="Amount" name="amount" value={formData.amount} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <DateFieldDMY label="Allocation Date" name="allocationDate"
                value={formData.allocationDate} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Letter Reference" name="letterReference" value={formData.letterReference} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button variant="outlined" color="inherit" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={handleSave}
              sx={{ background: gradients.brand }}>
              {saving ? "Saving..." : "Update Head"}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this head?"
        message={deleteTarget ? `"${deleteTarget.headName}" will be permanently removed.` : ""}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Locked-delete warning — shown when the head still has bills */}
      <Dialog open={!!lockedTarget} onClose={() => setLockedTarget(null)} fullWidth maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 4 } }}>
        <Box sx={{ background: gradients.brand, px: 3, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ color: "#fff", fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
            <LockIcon fontSize="small" /> Head Locked
          </Typography>
          <IconButton size="small" onClick={() => setLockedTarget(null)} sx={{ color: "#fff" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 3, pb: 3 }}>
          <Typography sx={{ color: brand.slate }}>
            {lockedTarget
              ? `"${lockedTarget.headName}" has ${lockedTarget.billCount} bill${Number(lockedTarget.billCount) === 1 ? "" : "s"} recorded against it. Delete all of its bills first — the delete button will unlock automatically once none remain.`
              : ""}
          </Typography>
          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
            <Button variant="contained" sx={{ background: gradients.brand }} onClick={() => setLockedTarget(null)}>
              Got it
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {ToastUI}
    </MainLayout>
  );
}
