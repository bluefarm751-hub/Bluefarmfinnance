import { useEffect, useState } from "react";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  MenuItem,
  TextField,
  Chip,
  Collapse,
  Divider,
  IconButton,
} from "@mui/material";

import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PrintIcon from "@mui/icons-material/Print";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import { getContingentBills, deleteContingentBill, markContingentBillPrinted } from "../api/financeApi";
import { useToast } from "../utils/useToast";
import { exportExcel } from "../utils/exportExcel";
import { printContingentBillPdf, downloadContingentBillPdf } from "../utils/contingentBillPdf";
import { brand, shadowCard } from "../theme";

// Matches the boxed, alternating-row look used everywhere else in the app
// (Temporary Receipt table, Cash Book, etc.) — a dark blue outer box with
// light blue / white-gradient rows inside, instead of plain white cards.
const rowBg = (i) => (i % 2 ? brand.rowWhiteGradient : brand.rowBlue);
const rowTextColor = (i) => (i % 2 ? brand.rowTextOnWhite : brand.rowText);

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ContingentBillReport() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();
  const farm = localStorage.getItem("farm") || "Blue Farm";

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterHead, setFilterHead] = useState("all");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const billRes = await getContingentBills();
      setBills(billRes.data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load contingent bills", "error");
    } finally {
      setLoading(false);
    }
  };

  const years = Array.from(new Set(bills.map((b) => b.year).filter(Boolean))).sort().reverse();
  const headOptions = Array.from(new Set(bills.map((b) => b.headName).filter(Boolean))).sort();

  const filtered = bills.filter((b) => {
    if (filterMonth !== "all" && b.month !== filterMonth) return false;
    if (filterYear !== "all" && b.year !== filterYear) return false;
    if (filterHead !== "all" && (b.headName || "") !== filterHead) return false;
    return true;
  });

  const totalAmount = filtered.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0);

  const handleExportExcel = () => {
    const columns = [
      { key: "voucherNo", label: "Voucher No" },
      { key: "month", label: "Month" },
      { key: "year", label: "Year" },
      { key: "headName", label: "Payment Head" },
      { key: "paymentToMS", label: "Payment to M/S" },
      { key: "authority", label: "Authority" },
      { key: "totalAmount", label: "Total Amount" },
      { key: "amountInWords", label: "Amount in Words" },
    ];
    const rows = filtered.map((b) => ({
      voucherNo: b.voucherNo || "",
      month: b.month || "",
      year: b.year || "",
      headName: b.headName || "",
      paymentToMS: b.paymentToMS || "",
      authority: b.authority || "",
      totalAmount: Number(b.totalAmount || 0).toLocaleString(),
      amountInWords: b.amountInWords || "",
    }));
    exportExcel("Contingent_Bill_Report", columns, rows);
  };

  const handlePrintVoucher = (bill) => {
    // Keep the report status in sync immediately after the browser print
    // dialog has returned. The print helper also guards this callback so it
    // can only run once.
    printContingentBillPdf(bill, farm, async () => {
      try {
        const res = await markContingentBillPrinted(bill.id);
        const printedBill = res?.data || {};
        setBills((prev) =>
          prev.map((b) =>
            b.id === bill.id
              ? {
                  ...b,
                  printed: true,
                  printedAt: printedBill.printedAt || new Date().toISOString(),
                }
              : b
          )
        );
        showToast(`Voucher ${bill.voucherNo || bill.id} marked as PRINTED`, "success");
      } catch (err) {
        console.error("Failed to mark contingent bill as printed:", err);
        showToast("Voucher printed, but PRINTED status could not be saved", "warning");
      }
    });
  };

  const handleDownloadPdf = (bill) => {
    downloadContingentBillPdf(bill, farm, `Contingent_Bill_${bill.voucherNo || bill.id}.pdf`);
  };

  const handleDelete = async () => {
    const bill = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteContingentBill(bill.id);
      showToast("Contingent bill deleted", "success");
      load();
    } catch (err) {
      console.error(err);
      showToast("Could not delete this contingent bill", "error");
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
        }}>REPORTS
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>
          Report Contingent Bill
        </Typography>
        <Typography color="text.secondary" mb={3}>
          Browse saved Contingent Bill vouchers — filter, print the original voucher layout, or export to Excel.
        </Typography>

        {/* Filters */}
        <Card elevation={3} sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                >
                  <MenuItem value="all">All Months</MenuItem>
                  {MONTHS.map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Year"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                >
                  <MenuItem value="all">All Years</MenuItem>
                  {years.map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Payment Head"
                  value={filterHead}
                  onChange={(e) => setFilterHead(e.target.value)}
                >
                  <MenuItem value="all">All Heads</MenuItem>
                  {headOptions.map((h) => (
                    <MenuItem key={h} value={h}>{h}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={12} md={4}>
                <Box sx={{ display: "flex", gap: 1, justifyContent: { md: "flex-end" } }}>
                  <Button
                    variant="contained"
                    startIcon={<FileDownloadIcon />}
                    onClick={handleExportExcel}
                    sx={{ background: "#1E8E5A", "&:hover": { background: "#166B44" } }}
                  >
                    Excel
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* No bills */}
        {!loading && filtered.length === 0 && (
          <Card sx={{ borderRadius: 3, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,0.14)" }}>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <Typography color="text.secondary">No contingent bills match the current filters.</Typography>
            </CardContent>
          </Card>
        )}

        {/* List — boxed dark-blue outer panel with alternating light rows,
            matching the table style used across the rest of the app. */}
        <Box sx={{
          background: brand.panelSoft, border: `1px solid ${brand.tableCardBorder}`,
          borderRadius: 3, boxShadow: shadowCard, p: 1.2,
          display: "flex", flexDirection: "column", gap: 1,
        }}>
          {filtered.map((b, i) => {
            const isExpanded = expandedId === b.id;
            const txt = rowTextColor(i);
            const printedRowBackground =
              "linear-gradient(135deg,#EAF7EF 0%,#D8F0DF 100%)";
            const printedRowBorder = "1px solid rgba(30,142,90,0.45)";

            return (
              <Box
                key={b.id}
                sx={{
                  background: b.printed ? printedRowBackground : rowBg(i),
                  borderRadius: 2, p: 2,
                  border: b.printed ? printedRowBorder : "1px solid rgba(8,33,63,0.12)",
                  boxShadow: b.printed ? "inset 4px 0 0 #1E8E5A" : "none",
                }}
              >
                <Box>
                  <Box sx={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    flexWrap: "nowrap", gap: 2,
                  }}>
                    <Box sx={{
                      display: "flex", gap: 1.5, alignItems: "center", flexWrap: "nowrap",
                      overflowX: "auto", minWidth: 0, py: 0.5,
                      "&::-webkit-scrollbar": { height: 4 },
                    }}>
                      <Chip
                        label={`Voucher ${b.voucherNo || "—"}`}
                        sx={{ fontWeight: 700, background: "linear-gradient(135deg,#1E88E5,#1565C0)", color: "#fff", whiteSpace: "nowrap", flexShrink: 0 }}
                      />
                      {b.printed && (
                        <Chip
                          label="PRINTED"
                          size="small"
                          sx={{
                            fontWeight: 900, fontSize: 10.5,
                            background: "#1E8E5A", color: "#fff",
                            whiteSpace: "nowrap", flexShrink: 0,
                            boxShadow: "0 1px 4px rgba(30,142,90,0.25)",
                          }}
                        />
                      )}
                      <Chip label={`${b.month} ${b.year}`} variant="outlined" sx={{ fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, color: b.printed ? "#1B5E3B" : txt, borderColor: b.printed ? "#1E8E5A" : txt }} />
                      <Chip
                        label={`Head: ${b.headName || "—"}`}
                        variant="outlined"
                        sx={{
                          fontWeight: 800, whiteSpace: "nowrap", flexShrink: 0,
                          maxWidth: 260, color: b.printed ? "#1B5E3B" : txt,
                          borderColor: b.printed ? "#1E8E5A" : txt,
                        }}
                      />
                      <Chip label={b.paymentToMS || "—"} variant="outlined" sx={{ fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0, maxWidth: 220, color: b.printed ? "#1B5E3B" : txt, borderColor: b.printed ? "#1E8E5A" : txt }} />
                      <Chip
                        label={`Total: Rs. ${Number(b.totalAmount || 0).toLocaleString()}`}
                        sx={{ fontWeight: 700, background: brand.success, color: "#fff", whiteSpace: "nowrap", flexShrink: 0 }}
                      />
                    </Box>

                    <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
                      <Button
                        variant="contained"
                        startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        onClick={() => setExpandedId(isExpanded ? null : b.id)}
                        sx={{ background: "#0F4C81", "&:hover": { background: "#0B3A63" }, whiteSpace: "nowrap" }}
                      >
                        {isExpanded ? "Hide Details" : "View Details"}
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/finance/edit-contingent-bill/${b.id}`)}
                        sx={{ background: "#9C7A1E", "&:hover": { background: "#7A5F16" }, whiteSpace: "nowrap" }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<PrintIcon />}
                        onClick={() => handlePrintVoucher(b)}
                        sx={{ background: "#16608f", "&:hover": { background: "#124d72" }, whiteSpace: "nowrap" }}
                      >
                        Print Voucher
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => handleDownloadPdf(b)}
                        sx={{ background: "#B3261E", "&:hover": { background: "#8E1E17" }, whiteSpace: "nowrap" }}
                      >
                        Download PDF
                      </Button>
                      <IconButton color="error" onClick={() => setConfirmDelete(b)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  <Collapse in={isExpanded}>
                    <Divider sx={{ my: 2, borderColor: "rgba(8,33,63,0.18)" }} />
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} md={4}>
                        <Typography variant="caption" sx={{ color: txt, opacity: 0.75 }}>Payment Head</Typography>
                        <Typography fontWeight={700} sx={{ color: txt }}>{b.headName || "—"}</Typography>
                      </Grid>
                      <Grid item xs={12} md={8}>
                        <Typography variant="caption" sx={{ color: txt, opacity: 0.75 }}>Authority</Typography>
                        <Typography fontWeight={700} sx={{ color: txt }}>{b.authority || "—"}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="caption" sx={{ color: txt, opacity: 0.75 }}>Rupees</Typography>
                        <Typography fontWeight={700} sx={{ color: txt }}>{b.amountInWords || "—"}</Typography>
                      </Grid>
                    </Grid>

                    {[...(b.items || [])]
                      .sort((x, y) => (x.billDate || "").localeCompare(y.billDate || ""))
                      .map((it, j) => (
                      <Box
                        key={it.id || j}
                        sx={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          flexWrap: "nowrap", gap: 1, py: 1, borderBottom: "1px solid rgba(8,33,63,0.15)",
                        }}
                      >
                        <Box sx={{ minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}>
                          <Typography fontWeight={700} noWrap title={it.description || "—"} sx={{ color: txt }}>
                            {it.description || "—"}
                          </Typography>
                          <Typography variant="caption" noWrap sx={{ display: "block", color: txt, opacity: 0.75 }}>
                            Bill No: {it.billNo || "—"} • Date: {it.billDate || "—"}
                          </Typography>
                        </Box>
                        <Typography fontWeight={700} sx={{ flexShrink: 0, color: txt }}>
                          Rs. {Number(it.amount || 0).toLocaleString()}
                        </Typography>
                      </Box>
                    ))}
                  </Collapse>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Total */}
        {filtered.length > 0 && (
          <Box sx={{
            mt: 3, p: 2.5, borderRadius: 3, background: brand.panel,
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "nowrap", gap: 1,
          }}>
            <Typography fontWeight={700} noWrap sx={{ color: brand.ink }}>
              Total Vouchers: {filtered.length}
            </Typography>
            <Typography variant="h6" fontWeight="bold" noWrap sx={{ color: brand.ink }}>
              Total Amount: Rs. {totalAmount.toLocaleString()}
            </Typography>
          </Box>
        )}
      </Box>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this contingent bill?"
        message={confirmDelete ? `This will permanently delete voucher ${confirmDelete.voucherNo || "—"} for ${confirmDelete.paymentToMS}.` : ""}
        confirmLabel="Yes, Delete It"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {ToastUI}
    </MainLayout>
  );
}
