import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  MenuItem,
  IconButton,
  Divider,
  CircularProgress,
} from "@mui/material";

import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SortIcon from "@mui/icons-material/Sort";
import PrintIcon from "@mui/icons-material/Print";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

import MainLayout from "../layouts/MainLayout";
import { getContingentBill, updateContingentBill } from "../api/financeApi";
import DateFieldDMY from "../components/DateFieldDMY";
import { useToast } from "../utils/useToast";
import { numberToWords } from "../utils/numberToWords";
import { brand, gradients } from "../theme";
import { PAYMENT_HEAD_OPTIONS } from "./AddContingentBill";
import { printContingentBillPdf, downloadContingentBillPdf } from "../utils/contingentBillPdf";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const emptyRow = () => ({ billNo: "", billDate: "", description: "", amount: "" });

// Sorts rows by date (oldest first) so entries always end up saved and
// printed in date order, even if they were typed in a different order.
// Rows with no date yet are kept, in their original order, at the end.
const sortRowsByDate = (rows) =>
  rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const da = a.r.billDate || "";
      const db = b.r.billDate || "";
      if (!da && !db) return a.i - b.i;
      if (!da) return 1;
      if (!db) return -1;
      if (da === db) return a.i - b.i;
      return da < db ? -1 : 1;
    })
    .map(({ r }) => r);

export default function EditContingentBill() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast, ToastUI } = useToast();
  const farm = localStorage.getItem("farm") || "Blue Farm";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    voucherNo: "",
    month: MONTHS[new Date().getMonth()],
    year: String(new Date().getFullYear()),
    paymentHead: "",
    paymentHeadOther: "",
    paymentToMS: "",
    authority: "",
    chequeNo: "",
    chequeDate: "",
    receivedByName: "",
    receivedByRank: "",
  });

  const [rows, setRows] = useState([emptyRow()]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getContingentBill(id);
        const bill = res.data;
        const knownHead = PAYMENT_HEAD_OPTIONS.includes(bill.headName);
        setFormData({
          voucherNo: bill.voucherNo || "",
          month: bill.month || MONTHS[new Date().getMonth()],
          year: bill.year || String(new Date().getFullYear()),
          paymentHead: knownHead ? bill.headName : (bill.headName ? "Other" : ""),
          paymentHeadOther: knownHead ? "" : (bill.headName || ""),
          paymentToMS: bill.paymentToMS || "",
          authority: bill.authority || "AHQ",
          chequeNo: bill.chequeNo || "",
          chequeDate: bill.chequeDate || "",
          receivedByName: bill.receivedByName || "",
          receivedByRank: bill.receivedByRank || "",
        });
        const loadedRows = (bill.items || []).map((it) => ({
          billNo: it.billNo || "",
          billDate: it.billDate || "",
          description: it.description || "",
          amount: it.amount != null ? String(it.amount) : "",
        }));
        setRows(loadedRows.length ? sortRowsByDate(loadedRows) : [emptyRow()]);
      } catch (err) {
        console.error(err);
        showToast("Failed to load contingent bill", "error");
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRowChange = (idx, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (idx) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  // Lets the user re-order the rows on screen by date right away, instead
  // of only finding out the saved order after saving.
  const handleSortByDate = () => {
    setRows((prev) => sortRowsByDate(prev));
  };

  const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const amountInWords = totalAmount > 0 ? numberToWords(totalAmount) : "";

  // Builds the same shape the PDF utilities expect, from the current form
  // state, so Print / Download reflect any unsaved edits too.
  const buildPreviewBill = () => {
    const { paymentHeadOther, ...rest } = formData;
    const paymentHead =
      formData.paymentHead === "Other" ? paymentHeadOther.trim() : formData.paymentHead;
    const validRows = rows.filter((r) => r.description.trim() || parseFloat(r.amount) > 0);
    return {
      ...rest,
      headName: paymentHead,
      totalAmount,
      amountInWords,
      items: sortRowsByDate(validRows),
    };
  };

  const handlePrintPreview = () => {
    const validRows = rows.filter((r) => r.description.trim() || parseFloat(r.amount) > 0);
    if (validRows.length === 0) {
      showToast("Add at least one bill row first", "error");
      return;
    }
    printContingentBillPdf(buildPreviewBill(), farm);
  };

  const handleDownloadPreview = () => {
    const validRows = rows.filter((r) => r.description.trim() || parseFloat(r.amount) > 0);
    if (validRows.length === 0) {
      showToast("Add at least one bill row first", "error");
      return;
    }
    downloadContingentBillPdf(buildPreviewBill(), farm, `Contingent_Bill_${formData.voucherNo || id}.pdf`);
  };

  const handleSave = async () => {
    if (!formData.paymentToMS.trim()) {
      showToast("Payment to M/S is required", "error");
      return;
    }
    if (formData.paymentHead === "Other" && !formData.paymentHeadOther.trim()) {
      showToast("Please specify the Payment Head", "error");
      return;
    }
    const validRows = rows.filter((r) => r.description.trim() || parseFloat(r.amount) > 0);
    if (validRows.length === 0) {
      showToast("Add at least one bill row", "error");
      return;
    }

    // Auto-sort by date before saving, so an entry added later with an
    // earlier date still ends up in the right place in the voucher.
    const sortedRows = sortRowsByDate(validRows);

    const { paymentHeadOther, ...rest } = formData;
    const paymentHead =
      formData.paymentHead === "Other" ? paymentHeadOther.trim() : formData.paymentHead;

    setSaving(true);
    try {
      await updateContingentBill(id, {
        ...rest,
        paymentHead,
        totalAmount,
        amountInWords,
        items: sortedRows,
      });
      showToast("Contingent bill updated successfully", "success");
      setTimeout(() => navigate("/finance/contingent-bill-report"), 800);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Error updating contingent bill", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Box sx={{ p: 6, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>EDIT VOUCHER
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>
          Edit Contingent Bill
        </Typography>
        <Typography color="text.secondary" mb={3}>
          Update this Contingent Bill (Bills Payment Summary Voucher). Rows are automatically
          re-ordered by date when you save.
        </Typography>

        <Card elevation={4} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3.5 }}>
            <Typography sx={{ fontWeight: 800, color: brand.ink, mb: 1.5 }}>Voucher Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={2.5}>
                <TextField
                  fullWidth
                  label="Voucher No"
                  name="voucherNo"
                  value={formData.voucherNo}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </Grid>

              <Grid item xs={6} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Month"
                  name="month"
                  value={formData.month}
                  onChange={handleChange}
                >
                  {MONTHS.map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={6} md={1.5}>
                <TextField
                  fullWidth
                  label="Year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Payment Head"
                  name="paymentHead"
                  value={formData.paymentHead}
                  onChange={handleChange}
                >
                  <MenuItem value="">— None / General —</MenuItem>
                  {PAYMENT_HEAD_OPTIONS.map((h) => (
                    <MenuItem key={h} value={h}>{h}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              {formData.paymentHead === "Other" && (
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Specify Payment Head"
                    name="paymentHeadOther"
                    value={formData.paymentHeadOther}
                    onChange={handleChange}
                    placeholder="Type the payment head"
                  />
                </Grid>
              )}

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Payment to M/S"
                  name="paymentToMS"
                  value={formData.paymentToMS}
                  onChange={handleChange}
                  placeholder="e.g. HandyPk Pvt Ltd"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Authority"
                  name="authority"
                  value={formData.authority}
                  onChange={handleChange}
                  placeholder="e.g. AHQ/54209/3/Org Dated. 08-07-2026 (Allocation)"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Bill rows table */}
            <Box sx={{
              display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5,
            }}>
              <Typography sx={{ fontWeight: 800, color: brand.ink }}>Bill Rows</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" variant="contained" startIcon={<SortIcon />} onClick={handleSortByDate}
                  sx={{ background: "#9C7A1E", "&:hover": { background: "#7A5F16" } }}>
                  Sort by Date
                </Button>
                <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={addRow}
                  sx={{ background: "#1E8E5A", "&:hover": { background: "#166B44" } }}>
                  Add Row
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {rows.map((row, idx) => (
                <Grid container spacing={1.5} key={idx} alignItems="center">
                  <Grid item xs={12} md={1.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Bill No"
                      value={row.billNo}
                      onChange={(e) => handleRowChange(idx, "billNo", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <DateFieldDMY
                      size="small"
                      label="Date"
                      value={row.billDate}
                      onChange={(e) => handleRowChange(idx, "billDate", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={5.5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Description"
                      value={row.description}
                      onChange={(e) => handleRowChange(idx, "description", e.target.value)}
                      placeholder="e.g. Paddock Fence Work, Paint Work and Wood Polish Work"
                    />
                  </Grid>
                  <Grid item xs={10} md={2.5}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Amount"
                      value={row.amount}
                      onChange={(e) => handleRowChange(idx, "amount", e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={2} md={0.5}>
                    <IconButton
                      color="error"
                      onClick={() => removeRow(idx)}
                      disabled={rows.length === 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
            </Box>

            {/* Total + amount in words */}
            <Box sx={{
              mt: 3, p: 2.5, borderRadius: 3, background: brand.panel,
              display: "flex", flexDirection: "column", gap: 0.6,
            }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ fontWeight: 700, color: brand.ink }}>Total</Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: brand.ink }}>
                  Rs. {totalAmount.toLocaleString()}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 13.5, color: brand.slate }}>
                <b>Rupees:</b> {amountInWords || "—"}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography sx={{ fontWeight: 800, color: brand.ink, mb: 1.5 }}>
              Payment &amp; Receipt Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Vide Cheque No"
                  name="chequeNo"
                  value={formData.chequeNo}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <DateFieldDMY
                  label="Cheque Date"
                  name="chequeDate"
                  value={formData.chequeDate}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Received By — Name"
                  name="receivedByName"
                  value={formData.receivedByName}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Received By — Rank"
                  name="receivedByRank"
                  value={formData.receivedByRank}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2, flexWrap: "wrap" }}>
              <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => navigate("/finance/contingent-bill-report")}
                sx={{ background: "#6B7280", "&:hover": { background: "#4B5563" } }}>
                Cancel
              </Button>
              <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrintPreview}
                sx={{ background: "#16608f", "&:hover": { background: "#124d72" } }}>
                Print Voucher
              </Button>
              <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={handleDownloadPreview}
                sx={{ background: "#B3261E", "&:hover": { background: "#8E1E17" } }}>
                Download PDF
              </Button>
              <Button variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={handleSave}
                sx={{ background: gradients.brand }}>
                {saving ? "Saving..." : "Update Contingent Bill"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
