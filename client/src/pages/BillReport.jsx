import { useEffect, useState } from "react";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
} from "@mui/material";

import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

import MainLayout from "../layouts/MainLayout";
import { getBills, getFinanceHeads } from "../api/financeApi";
import DateFieldDMY from "../components/DateFieldDMY";
import { useToast } from "../utils/useToast";
import { exportExcel } from "../utils/exportExcel";
import { brand, gradients, tableHeadRowSx, tableBodyRowSx } from "../theme";

export default function BillReport() {
  const { showToast, ToastUI } = useToast();

  const [bills, setBills] = useState([]);
  const [heads, setHeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterHead, setFilterHead] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [billRes, headRes] = await Promise.all([getBills(), getFinanceHeads()]);
      setBills(billRes.data || []);
      setHeads(headRes.data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load bills", "error");
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filtered = bills.filter((b) => {
    if (filterHead !== "all" && String(b.headId) !== filterHead) return false;
    if (filterDateFrom && b.billDate && b.billDate < filterDateFrom) return false;
    if (filterDateTo && b.billDate && b.billDate > filterDateTo) return false;
    if (filterStatus !== "all") {
      const s = (b.status || "Not Paid").toLowerCase();
      if (s !== filterStatus.toLowerCase()) return false;
    }
    return true;
  });

  // Compute total
  const totalAmount = filtered.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  // ---- Excel Export ----
  const handleExportExcel = () => {
    const columns = [
      { key: "sNo", label: "S No" },
      { key: "billDate", label: "Date" },
      { key: "headName", label: "Head" },
      { key: "contractorName", label: "Contractor Name" },
      { key: "item", label: "Item" },
      { key: "qty", label: "Qty" },
      { key: "price", label: "Price" },
      { key: "amount", label: "Amount" },
      { key: "paymentMode", label: "Payment Mode" },
      { key: "status", label: "Status" },
      { key: "remarks", label: "Remarks" },
    ];
    const rows = filtered.map((b) => ({
      sNo: b.sNo,
      billDate: b.billDate || "",
      headName: b.headName || "",
      contractorName: b.contractorName || "",
      item: b.item || "",
      qty: b.qty || 0,
      price: Number(b.price || 0).toLocaleString(),
      amount: Number(b.amount || 0).toLocaleString(),
      paymentMode: b.paymentMode || "Cash",
      status: b.status || "Not Paid",
      remarks: b.remarks || "",
    }));
    exportExcel("Bill_Report", columns, rows);
  };

  // ---- PDF Export (window.print) ----
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>REPORTS
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>
          Bill Report
        </Typography>
        <Typography color="text.secondary" mb={3}>
          Filter bills by Head, Date, or Status — Export to Excel or PDF.
        </Typography>

        {/* Filters Row */}
        <Card elevation={3} sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  select
                  fullWidth
                  label="Filter by Head"
                  value={filterHead}
                  onChange={(e) => setFilterHead(e.target.value)}
                >
                  <MenuItem value="all">All Heads</MenuItem>
                  {heads.map((h) => (
                    <MenuItem key={h.id} value={String(h.id)}>{h.headName}</MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid item xs={6} md={2}>
                <DateFieldDMY
                  label="Date From"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </Grid>

              <Grid item xs={6} md={2}>
                <DateFieldDMY
                  label="Date To"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </Grid>

              <Grid item xs={12} md={2}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="not paid">Not Paid</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<FileDownloadIcon />}
                    onClick={handleExportExcel}
                    sx={{ background: "#1E8E5A", "&:hover": { background: "#166B44" } }}
                  >
                    Excel
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<PictureAsPdfIcon />}
                    onClick={handleExportPDF}
                    sx={{ background: "#C0392B", "&:hover": { background: "#96281B" } }}
                  >
                    PDF
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Report Table */}
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!loading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 4, color: brand.slate }}>
                        No bills match the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((b, i) => (
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
                          sx={{
                            px: 1.2,
                            py: 0.3,
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                            background: (b.status || "Not Paid") === "Paid" ? "#2FBF71" : "#F0574D",
                            color: "#fff",
                            display: "inline-block",
                          }}
                        >
                          {b.status || "Not Paid"}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Total Row */}
            <Box sx={{
              p: 2, borderTop: `2px solid ${brand.gold}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <Typography fontWeight={700} sx={{ color: brand.ink }}>
                Total Bills: {filtered.length}
              </Typography>
              <Typography variant="h6" fontWeight="bold" sx={{ color: brand.danger }}>
                Total Amount: Rs. {totalAmount.toLocaleString()}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Print Styles for PDF */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .MuiCard-root, .MuiCard-root * { visibility: visible; }
            .MuiCard-root { position: absolute; left: 0; top: 0; width: 100%; }
          }
        `}</style>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
