import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  MenuItem,
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
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

import MainLayout from "../layouts/MainLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  API_BASE,
  getBills,
  getFinanceHeads,
  updateBill,
  deleteBill,
} from "../api/financeApi";
import { useToast } from "../utils/useToast";
import { brand, gradients, tableHeadRowSx, tableBodyRowSx } from "../theme";
import DateFieldDMY from "../components/DateFieldDMY";

export default function EditBill() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();

  const [bills, setBills] = useState([]);
  const [heads, setHeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    headId: "",
    contractorName: "",
    item: "",
    qty: "",
    price: "",
    amount: "",
    billDate: "",
    paymentMode: "Cash",
    chequeNo: "",
    chequeDate: "",
    status: "Not Paid",
    remarks: "",
  });
  const [billPic, setBillPic] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removePic, setRemovePic] = useState(false);
  const [saving, setSaving] = useState(false);

  const [viewPic, setViewPic] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Same pattern used for Employee Documents: if the stored path is
  // already an absolute URL (e.g. cloud storage), use it as-is; otherwise
  // treat it as relative to this app's own origin.
  const fullUrl = (p) => (p && p.startsWith("http") ? p : `${API_BASE}${p}`);
  const isPdfPath = (p) => /\.pdf($|\?)/i.test(p || "");

  // Track if user manually edited amount
  const manualAmountRef = useRef(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [billRes, headRes] = await Promise.all([getBills(), getFinanceHeads()]);
      setBills(billRes.data);
      setHeads(headRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (b) => {
    setEditing(b);
    setBillPic(null);
    setPreview(b.billPic ? fullUrl(b.billPic) : null);
    setRemovePic(false);
    manualAmountRef.current = false; // reset flag when opening edit
    setFormData({
      headId: b.headId || "",
      contractorName: b.contractorName || "",
      item: b.item || "",
      qty: b.qty ?? "",
      price: b.price ?? "",
      amount: b.amount ?? "",
      billDate: b.billDate || "",
      paymentMode: b.paymentMode || "Cash",
      chequeNo: b.chequeNo || "",
      chequeDate: b.chequeDate || "",
      status: b.status || "Not Paid",
      remarks: b.remarks || "",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // If user changed Qty or Price → auto-calculate Amount
      if (name === "qty" || name === "price") {
        manualAmountRef.current = false;
        const qty = name === "qty" ? parseFloat(value) || 0 : parseFloat(prev.qty) || 0;
        const price = name === "price" ? parseFloat(value) || 0 : parseFloat(prev.price) || 0;
        updated.amount = (qty * price).toString();
      }

      // If user changed Amount directly → mark manual override
      if (name === "amount") {
        manualAmountRef.current = true;
      }

      return updated;
    });
  };

  const handlePic = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!ALLOWED.includes(file.type)) {
      showToast("Only JPG, PNG, WEBP or PDF files are allowed", "error");
      e.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast("File is too large (max 8MB)", "error");
      e.target.value = "";
      return;
    }

    setBillPic(file);
    setPreview(URL.createObjectURL(file));
    setRemovePic(false);
  };

  const handleRemovePic = () => {
    setBillPic(null);
    setPreview(null);
    setRemovePic(true);
  };

  const isPdfPreview = (billPic && billPic.type === "application/pdf") || (!billPic && preview && /\.pdf($|\?)/i.test(preview));

  const handleSave = async () => {
    if (!formData.headId) {
      showToast("Please select a head", "error");
      return;
    }
    setSaving(true);
    try {
      await updateBill(editing.id, { ...formData, removeBillPic: removePic }, billPic);
      showToast("Bill updated successfully", "success");
      setEditing(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Error updating bill", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteBill(deleteTarget.id);
      showToast("Bill deleted — amount returned to head", "success");
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || "Error deleting bill", "error");
    }
  };

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 3 }}>
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>MANAGE BILLS
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>
          Edit Bill
        </Typography>
        <Typography color="text.secondary" mb={3}>
          View bill pictures, edit details or delete a bill — head balances update automatically.
        </Typography>

        <Card elevation={4} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={tableHeadRowSx}>
                    <TableCell sx={{ fontWeight: 800 }}>S No</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Head</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Contractor Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Item</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Qty</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Price</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Payment Mode</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!loading && bills.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 4, color: brand.slate }}>
                        No bills added yet. Add one from the "Add Bill" tab.
                      </TableCell>
                    </TableRow>
                  )}
                  {bills.map((b, i) => (
                    <TableRow key={b.id} hover sx={tableBodyRowSx(i)}>
                      <TableCell>{b.sNo}</TableCell>
                      <TableCell>{b.billDate || "—"}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{b.headName || "—"}</TableCell>
                      <TableCell>{b.contractorName || "—"}</TableCell>
                      <TableCell>{b.item || "—"}</TableCell>
                      <TableCell>{b.qty || 0}</TableCell>
                      <TableCell>Rs. {Number(b.price || 0).toLocaleString()}</TableCell>
                      <TableCell>Rs. {Number(b.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>{b.paymentMode || "Cash"}</TableCell>
                      <TableCell>
                        <Box
                          component="span"
                          onClick={async () => {
                            const newStatus = b.status === "Paid" ? "Not Paid" : "Paid";
                            try {
                              await updateBill(b.id, { ...b, status: newStatus });
                              load();
                            } catch (err) {
                              showToast("Error updating status", "error");
                            }
                          }}
                          sx={{
                            cursor: "pointer",
                            px: 1.2,
                            py: 0.3,
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                            background: b.status === "Paid" ? "#2FBF71" : "#F0574D",
                            color: "#fff",
                            display: "inline-block",
                            userSelect: "none",
                            "&:hover": { opacity: 0.85 },
                          }}
                        >
                          {b.status || "Not Paid"}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          disabled={!b.billPic}
                          className="bf-action-view" onClick={() => setViewPic(b.billPic)}
                          sx={{ color: brand.goldDark }}
                          title="View bill"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" className="bf-action-edit" onClick={() => openEdit(b)} sx={{ color: brand.blueDeep }} title="Edit">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" className="bf-action-delete" onClick={() => setDeleteTarget(b)} sx={{ color: brand.danger }} title="Delete">
                          <DeleteIcon fontSize="small" />
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
          <Typography sx={{ color: "#fff", fontWeight: 800 }}>Edit Bill</Typography>
          <IconButton size="small" onClick={() => setEditing(null)} sx={{ color: "#fff" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth label="Head" name="headId" value={formData.headId} onChange={handleChange}>
                {heads.map((h) => (
                  <MenuItem key={h.id} value={h.id}>{h.headName}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Contractor Name" name="contractorName" value={formData.contractorName} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Item" name="item" value={formData.item} onChange={handleChange} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth type="number" label="Qty" name="qty" value={formData.qty} onChange={handleChange} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth type="number" label="Price" name="price" value={formData.price} onChange={handleChange} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                fullWidth type="number" label="Amount" name="amount"
                value={formData.amount} onChange={handleChange}
                helperText="Auto = Qty × Price"
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <DateFieldDMY
                label="Bill Date" name="billDate"
                value={formData.billDate} onChange={handleChange}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                select
                fullWidth
                label="Payment Mode"
                name="paymentMode"
                value={formData.paymentMode}
                onChange={handleChange}
              >
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Bank">Bank</MenuItem>
              </TextField>
            </Grid>
            {/* Cheque fields — only show when Bank is selected */}
            {formData.paymentMode === "Bank" && (
              <>
                <Grid item xs={6} md={3}>
                  <TextField
                    fullWidth
                    label="Cheque No"
                    name="chequeNo"
                    value={formData.chequeNo}
                    onChange={handleChange}
                    placeholder="Optional"
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <DateFieldDMY
                    label="Cheque Date"
                    name="chequeDate"
                    value={formData.chequeDate}
                    onChange={handleChange}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={6} md={3}>
              <TextField select fullWidth label="Status" name="status" value={formData.status} onChange={handleChange}>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Not Paid">Not Paid</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth multiline minRows={2} label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{
                border: `1.5px dashed ${brand.gold}`, borderRadius: 3, p: 2,
                display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
              }}>
                <Button component="label" variant="outlined" startIcon={<PhotoCamera />}>
                  Change Bill Picture
                  <input hidden accept="image/jpeg,image/png,image/webp,application/pdf" type="file" onChange={handlePic} />
                </Button>

                {preview && (
                  isPdfPreview ? (
                    <Box
                      component="a"
                      href={preview}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        width: 100, height: 80, borderRadius: 2, border: `1px solid ${brand.gold}`,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        gap: 0.3, textDecoration: "none", background: "#dfebfa",
                      }}
                    >
                      <PictureAsPdfIcon sx={{ fontSize: 28, color: "#D32F2F" }} />
                      <Typography sx={{ fontSize: 10.5, color: brand.ink, fontWeight: 700 }}>PDF Bill</Typography>
                    </Box>
                  ) : (
                    <Box component="img" src={preview} alt="Bill"
                      sx={{ width: 120, height: 90, objectFit: "cover", borderRadius: 2, border: `1px solid ${brand.gold}` }} />
                  )
                )}

                {preview && (
                  <Button
                    size="small"
                    color="error"
                    variant="text"
                    startIcon={<DeleteIcon fontSize="small" />}
                    onClick={handleRemovePic}
                  >
                    Remove Picture
                  </Button>
                )}

                {!preview && (
                  <Typography sx={{ color: brand.slate, fontSize: 13 }}>
                    No bill picture attached.
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button variant="outlined" color="inherit" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={handleSave}
              sx={{ background: gradients.brand }}>
              {saving ? "Saving..." : "Update Bill"}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* View bill — shown inside the app, same as Employee Documents */}
      <Dialog open={!!viewPic} onClose={() => setViewPic(null)} maxWidth="lg" fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}>
        <Box sx={{ background: gradients.brand, px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography fontWeight={800} sx={{ color: "#fff" }}>Bill</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" onClick={() => viewPic && window.open(fullUrl(viewPic), "_blank", "noopener,noreferrer")}
              sx={{ color: "#fff", borderColor: "#ffffff66" }} variant="outlined">
              Open in new tab
            </Button>
            <IconButton size="small" onClick={() => setViewPic(null)} sx={{ color: "#fff" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <Box sx={{ background: "#f4f7fc", p: 2, minHeight: 420 }}>
          {viewPic && isPdfPath(viewPic) && (
            <iframe
              title="Bill"
              src={fullUrl(viewPic)}
              style={{ width: "100%", height: "72vh", border: "none", borderRadius: 12, background: "#dfebfa" }}
            />
          )}
          {viewPic && !isPdfPath(viewPic) && (
            <Box sx={{ textAlign: "center" }}>
              <Box component="img" src={fullUrl(viewPic)} alt="Bill"
                sx={{ maxWidth: "100%", maxHeight: "72vh", borderRadius: 12, background: "#dfebfa" }} />
            </Box>
          )}
        </Box>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this bill?"
        message={deleteTarget ? `Bill #${deleteTarget.sNo} will be removed and its amount returned to the head.` : ""}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {ToastUI}
    </MainLayout>
  );
}
