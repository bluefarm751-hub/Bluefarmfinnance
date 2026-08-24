import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from "@mui/material";

import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteIcon from "@mui/icons-material/Delete";

import MainLayout from "../layouts/MainLayout";
import FarmSourceBadge from "../components/FarmSourceBadge";
import ConfirmDialog from "../components/ConfirmDialog";
import DateFieldDMY from "../components/DateFieldDMY";
import {
  getFinanceHeads,
  addFinanceHead,
  getAllocations,
  addAllocation,
  deleteAllocation,
} from "../api/financeApi";
import { useToast } from "../utils/useToast";
import { brand, gradients, tableHeadRowSx, tableBodyRowSx } from "../theme";

export default function AddAllocation() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();

  const [heads, setHeads] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newHeadName, setNewHeadName] = useState("");
  const [savingHead, setSavingHead] = useState(false);

  const [formData, setFormData] = useState({
    headId: "",
    amount: "",
    allocationDate: "",
    letterReference: "",
    remarks: "",
  });

  useEffect(() => {
    loadHeads();
  }, []);

  useEffect(() => {
    loadAllocations(formData.headId);
  }, [formData.headId]);

  const loadHeads = async () => {
    try {
      const res = await getFinanceHeads();
      setHeads(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load heads", "error");
    }
  };

  const loadAllocations = async (headId) => {
    try {
      const res = await getAllocations(headId || undefined);
      setAllocations(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddHead = async () => {
    if (!newHeadName.trim()) {
      showToast("Head Name is required", "error");
      return;
    }
    setSavingHead(true);
    try {
      const res = await addFinanceHead({ headName: newHeadName.trim() });
      showToast("Head added successfully", "success");
      setNewHeadName("");
      const list = await getFinanceHeads();
      setHeads(list.data || []);
      const created =
        res?.data?.id ??
        (list.data || []).find((h) => h.headName === newHeadName.trim())?.id;
      if (created) setFormData((prev) => ({ ...prev, headId: created }));
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Error saving head", "error");
    } finally {
      setSavingHead(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.headId) {
      showToast("Please select a head", "error");
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    setSaving(true);
    try {
      await addAllocation(formData);
      showToast("Allocation added successfully", "success");
      // keep the same head selected so more allocations can be added quickly
      setFormData((prev) => ({
        ...prev,
        amount: "",
        allocationDate: "",
        letterReference: "",
        remarks: "",
      }));
      await loadHeads();
      await loadAllocations(formData.headId);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Error saving allocation", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAllocation(deleteTarget.id);
      showToast("Allocation deleted", "success");
      setDeleteTarget(null);
      await loadHeads();
      await loadAllocations(formData.headId);
    } catch (err) {
      showToast(err.response?.data?.message || "Error deleting allocation", "error");
    }
  };

  const selectedHead = heads.find((h) => String(h.id) === String(formData.headId));
  const listTotal = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>NEW HEAD & ALLOCATION
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>
          Add Head & Allocation
        </Typography>

        <Typography color="text.secondary" mb={3}>
          Add a new head here, then select a head and add its allocation amount. Every save creates a
          separate allocation entry, and all amounts add up into the same head.
        </Typography>

        <FarmSourceBadge type="ALLOCATION" />

        <Card elevation={4} sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography fontWeight={800} sx={{ color: brand.ink, mb: 1.5 }}>
              Add Head
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Head Name"
                  value={newHeadName}
                  onChange={(e) => setNewHeadName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={savingHead}
                  onClick={handleAddHead}
                  sx={{ background: gradients.brand }}
                >
                  {savingHead ? "Saving..." : "Save Head"}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card elevation={4} sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent sx={{ p: 3.5 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  sx={{ minWidth: 220 }}
                  label="Head"
                  name="headId"
                  value={formData.headId}
                  onChange={handleChange}
                >
                  {heads.length === 0 && (
                    <MenuItem value="" disabled>
                      No heads found — add a head first
                    </MenuItem>
                  )}
                  {heads.map((h) => (
                    <MenuItem key={h.id} value={h.id}>
                      {h.headName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Allocation Amount"
                  name="amount"
                  type="number"
                  value={formData.amount}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DateFieldDMY
                  label="Allocation Date"
                  name="allocationDate"
                  value={formData.allocationDate}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Letter Reference"
                  name="letterReference"
                  value={formData.letterReference}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Remarks (optional)"
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            {selectedHead && (
              <Box sx={{
                mt: 3, p: 2, borderRadius: 2,
                background: `${brand.gold}14`, border: `1px solid ${brand.gold}`,
              }}>
                <Typography fontWeight={700} sx={{ color: brand.ink }}>
                  {selectedHead.headName} — Total Allocated: Rs.{" "}
                  {Number(selectedHead.amount || 0).toLocaleString()}
                </Typography>
              </Box>
            )}

            <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/finance")}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={saving}
                onClick={handleSave}
                sx={{ background: gradients.brand }}
              >
                {saving ? "Saving..." : "Save Allocation"}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Allocation entries */}
        <Typography variant="h6" fontWeight={800} sx={{ color: brand.ink, mb: 1.5 }}>
          {formData.headId ? "Allocations of this Head" : "All Allocations"}
        </Typography>

        <Card elevation={4} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={tableHeadRowSx}>
                    <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Head</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Amount (Rs.)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Letter Ref.</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Remarks</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allocations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: brand.slate }}>
                        No allocation entries yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {allocations.map((a, i) => (
                    <TableRow key={a.id} hover sx={tableBodyRowSx(i)}>
                      <TableCell>{allocations.length - i}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{a.headName || "—"}</TableCell>
                      <TableCell>{Number(a.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>{a.allocationDate || "—"}</TableCell>
                      <TableCell>{a.letterReference || "—"}</TableCell>
                      <TableCell>{a.remarks || "—"}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(a)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ p: 2, borderTop: `2px solid ${brand.gold}`, display: "flex", gap: 4 }}>
              <Typography fontWeight={700} sx={{ color: brand.ink }}>
                Entries: {allocations.length}
              </Typography>
              <Typography fontWeight={700} sx={{ color: "#A24BD1" }}>
                Total: Rs. {listTotal.toLocaleString()}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this allocation?"
        message={
          deleteTarget
            ? `Rs. ${Number(deleteTarget.amount || 0).toLocaleString()} will be removed from "${deleteTarget.headName || "this head"}".`
            : ""
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {ToastUI}
    </MainLayout>
  );
}
