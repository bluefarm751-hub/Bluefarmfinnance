import { useEffect, useState, useRef, useCallback } from "react";
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
} from "@mui/material";

import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PhotoCamera from "@mui/icons-material/PhotoCamera";

import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import MainLayout from "../layouts/MainLayout";
import FarmSourceBadge from "../components/FarmSourceBadge";
import { getFinanceHeads, getBills, addBill } from "../api/financeApi";
import DateFieldDMY from "../components/DateFieldDMY";
import { useToast } from "../utils/useToast";
import { brand, gradients } from "../theme";

export default function AddBill() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();

  const [heads, setHeads] = useState([]);
  const [sNo, setSNo] = useState(1);
  const [saving, setSaving] = useState(false);
  const [billPic, setBillPic] = useState(null);
  const [preview, setPreview] = useState(null);

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

  // Track if user manually edited amount (prevents auto-override)
  const manualAmountRef = useRef(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [headRes, billRes] = await Promise.all([getFinanceHeads(), getBills()]);
      setHeads(headRes.data);
      const maxNo = (billRes.data || []).reduce((m, b) => Math.max(m, Number(b.sNo) || 0), 0);
      setSNo(maxNo + 1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // If user changed Qty or Price → auto-calculate Amount
      if (name === "qty" || name === "price") {
        manualAmountRef.current = false; // reset flag, we are auto-calculating now
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
  };

  const selectedHead = heads.find((h) => String(h.id) === String(formData.headId));
  const remainingAfter = selectedHead
    ? Number(selectedHead.remaining ?? selectedHead.amount ?? 0) - (parseFloat(formData.amount) || 0)
    : null;

  const handleSave = async () => {
    if (!formData.headId) {
      showToast("Please select a head", "error");
      return;
    }
    if (!formData.amount) {
      showToast("Amount is required", "error");
      return;
    }

    setSaving(true);
    try {
      await addBill({ ...formData, sNo }, billPic);
      showToast("Bill added — amount deducted from head", "success");
      setTimeout(() => navigate("/finance"), 800);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Error saving bill", "error");
    } finally {
      setSaving(false);
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
        }}>NEW BILL
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>
          Add Bill
        </Typography>
        <Typography color="text.secondary" mb={3}>
          The bill amount is automatically deducted from the selected head's balance.
        </Typography>

        <FarmSourceBadge type="BILL" />

        <Card elevation={4} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3.5 }}>
            <Grid container spacing={2}>
              {/* S No — auto-filled with the next number, but the user can
                  type their own value if they want a specific one. */}
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  label="S No"
                  type="number"
                  value={sNo}
                  onChange={(e) => setSNo(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </Grid>

              {/* Bill Date */}
              <Grid item xs={12} md={3}>
                <DateFieldDMY
                  label="Date"
                  name="billDate"
                  value={formData.billDate}
                  onChange={handleChange}
                />
              </Grid>

              {/* Head */}
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  sx={{ minWidth: 200 }}
                  label="Head"
                  name="headId"
                  value={formData.headId}
                  onChange={handleChange}
                >
                  {heads.map((h) => (
                    <MenuItem key={h.id} value={h.id}>
                      {h.headName} — Rs. {Number(h.remaining ?? h.amount ?? 0).toLocaleString()} left
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Contractor Name */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Contractor Name"
                  name="contractorName"
                  value={formData.contractorName}
                  onChange={handleChange}
                />
              </Grid>

              {/* Item */}
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Item" name="item" value={formData.item} onChange={handleChange} />
              </Grid>

              {/* Qty */}
              <Grid item xs={12} md={2}>
                <TextField fullWidth type="number" label="Qty" name="qty" value={formData.qty} onChange={handleChange} />
              </Grid>

              {/* Price */}
              <Grid item xs={12} md={3}>
                <TextField fullWidth type="number" label="Price" name="price" value={formData.price} onChange={handleChange} />
              </Grid>

              {/* Amount (auto Qty×Price, but can be manually edited) */}
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  helperText="Auto = Qty × Price (you can also type manually)"
                />
              </Grid>

              {/* Payment Mode */}
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  sx={{ minWidth: 160 }}
                  label="Payment Mode"
                  name="paymentMode"
                  value={formData.paymentMode}
                  onChange={handleChange}
                >
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Bank">Bank</MenuItem>
                </TextField>
              </Grid>

              {/* Status — right after Payment Mode, before Remarks */}
              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Not Paid">Not Paid</MenuItem>
                </TextField>
              </Grid>

              {/* Cheque fields — only show when Bank is selected */}
              {formData.paymentMode === "Bank" && (
                <>
                  <Grid item xs={12} md={1.5}>
                    <TextField
                      fullWidth
                      label="Cheque No"
                      name="chequeNo"
                      value={formData.chequeNo}
                      onChange={handleChange}
                      placeholder="Optional"
                    />
                  </Grid>
                  <Grid item xs={12} md={1.5}>
                    <DateFieldDMY
                      label="Cheque Date"
                      name="chequeDate"
                      value={formData.chequeDate}
                      onChange={handleChange}
                    />
                  </Grid>
                </>
              )}

              {/* Remarks — next to Payment Mode */}
              <Grid item xs={12} md={formData.paymentMode === "Bank" ? 3 : 6}>
                <TextField fullWidth multiline minRows={2} label="Remarks" name="remarks" value={formData.remarks} onChange={handleChange} />
              </Grid>

              {/* Bill Picture */}
              <Grid item xs={12}>
                <Box sx={{
                  border: `1.5px dashed ${brand.gold}`,
                  borderRadius: 3,
                  p: 2.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  background: "rgba(212,175,55,0.06)",
                }}>
                  <Button component="label" variant="outlined" startIcon={<PhotoCamera />}>
                    Upload Bill Picture
                    <input hidden accept="image/jpeg,image/png,image/webp,application/pdf" type="file" onChange={handlePic} />
                  </Button>

                  {preview ? (
                    billPic?.type === "application/pdf" ? (
                      <Box
                        component="a"
                        href={preview}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          width: 150, height: 110, borderRadius: 2, border: `1px solid ${brand.gold}`,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          gap: 0.5, textDecoration: "none", background: "#dfebfa",
                        }}
                      >
                        <PictureAsPdfIcon sx={{ fontSize: 34, color: "#D32F2F" }} />
                        <Typography sx={{ fontSize: 11.5, color: brand.ink, fontWeight: 700 }}>
                          {billPic.name.length > 18 ? billPic.name.slice(0, 15) + "…pdf" : billPic.name}
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        component="img"
                        src={preview}
                        alt="Bill preview"
                        sx={{ width: 150, height: 110, objectFit: "cover", borderRadius: 2, border: `1px solid ${brand.gold}` }}
                      />
                    )
                  ) : (
                    <Typography sx={{ color: brand.slate, fontSize: 14 }}>
                      No bill picture selected yet. JPG, PNG, WEBP or PDF — up to 8MB.
                    </Typography>
                  )}
                </Box>
              </Grid>

              {selectedHead && (
                <Grid item xs={12}>
                  <Box sx={{ p: 2, borderRadius: 2, background: brand.panel }}>
                    <Typography sx={{ fontSize: 14, color: brand.ink, fontWeight: 700 }}>
                      {selectedHead.headName}: Rs. {Number(selectedHead.remaining ?? selectedHead.amount ?? 0).toLocaleString()} available
                      {" → "}
                      Rs. {Number(remainingAfter || 0).toLocaleString()} after this bill
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>

            <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button variant="outlined" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate("/finance")}>
                Cancel
              </Button>
              <Button variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={handleSave}
                sx={{ background: gradients.brand }}>
                {saving ? "Saving..." : "Save Bill"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
