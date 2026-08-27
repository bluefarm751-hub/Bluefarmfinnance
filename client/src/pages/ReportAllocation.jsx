import { useEffect, useState } from "react";

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
} from "@mui/material";

import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

import MainLayout from "../layouts/MainLayout";
import { getFinanceHeads, getAllocations } from "../api/financeApi";
import { useToast } from "../utils/useToast";
import { exportExcel } from "../utils/exportExcel";
import { brand, tableHeadRowSx, tableBodyRowSx } from "../theme";

export default function ReportAllocation() {
  const { showToast, ToastUI } = useToast();

  const [heads, setHeads] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [headId, setHeadId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [headId]);

  const load = async () => {
    setLoading(true);
    try {
      const [headRes, allocRes] = await Promise.all([
        getFinanceHeads(),
        getAllocations(headId || undefined),
      ]);
      setHeads(headRes.data || []);
      setAllocations(allocRes.data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load allocations", "error");
    } finally {
      setLoading(false);
    }
  };

  const totalAllocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const headsCount = new Set(allocations.map((a) => a.headId)).size;

  const handleExportExcel = () => {
    const columns = [
      { key: "sNo", label: "S.No" },
      { key: "headName", label: "Head Name" },
      { key: "amount", label: "Allocation Amount" },
      { key: "allocationDate", label: "Allocation Date" },
      { key: "letterReference", label: "Letter Reference" },
      { key: "remarks", label: "Remarks" },
    ];
    const rows = allocations.map((a, i) => ({
      sNo: allocations.length - i,
      headName: a.headName || "",
      amount: Number(a.amount || 0).toLocaleString(),
      allocationDate: a.allocationDate || "",
      letterReference: a.letterReference || "",
      remarks: a.remarks || "",
    }));
    exportExcel("Allocation_Report", columns, rows);
  };

  const handleExportPDF = () => {
    window.print();
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
          Report Allocation
        </Typography>
        <Typography color="text.secondary" mb={3}>
          Every allocation entry with head, amount, date &amp; letter reference — print or export to Excel / PDF.
        </Typography>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[
            { label: "Allocation Entries", value: allocations.length, color: "#1E88E5" },
            { label: "Heads Covered", value: headsCount, color: "#16608f" },
            { label: "Total Allocated", value: `Rs. ${totalAllocated.toLocaleString()}`, color: "#A24BD1" },
          ].map((c) => (
            <Grid item xs={12} sm={6} md={4} key={c.label}>
              <Box sx={{
                borderRadius: 4,
                background: c.color,
                color: "#fff",
                p: 3,
                textAlign: "center",
                border: "2px solid rgba(255,255,255,0.3)",
              }}>
                <Typography fontSize={14} fontWeight={600} sx={{ opacity: 0.9 }}>{c.label}</Typography>
                <Typography variant="h5" fontWeight="bold">{c.value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Filter + Export */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 3, alignItems: "center" }} className="no-print">
          <TextField
            select
            size="small"
            label="Filter by Head"
            value={headId}
            onChange={(e) => setHeadId(e.target.value)}
            sx={{ minWidth: 220, background: "#dfebfa" }}
          >
            <MenuItem value="">All Heads</MenuItem>
            {heads.map((h) => (
              <MenuItem key={h.id} value={h.id}>{h.headName}</MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportExcel}
            sx={{ background: "#1E8E5A", "&:hover": { background: "#166B44" } }}
          >
            Export Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<PictureAsPdfIcon />}
            onClick={handleExportPDF}
            sx={{ background: "#C0392B", "&:hover": { background: "#96281B" } }}
          >
            Export PDF
          </Button>
        </Box>

        {/* Allocations Table */}
        <Card elevation={4} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={tableHeadRowSx}>
                    <TableCell sx={{ fontWeight: 800 }}>S.No</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Head Name</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Amount (Rs.)</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Allocation Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Letter Ref.</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!loading && allocations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: brand.slate }}>
                        No allocations added yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {allocations.map((a, i) => (
                    <TableRow key={a.id} hover sx={tableBodyRowSx(i)}>
                      <TableCell>{allocations.length - i}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{a.headName || "—"}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#7A1FA2" }}>
                        {Number(a.amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>{a.allocationDate || "—"}</TableCell>
                      <TableCell>{a.letterReference || "—"}</TableCell>
                      <TableCell>{a.remarks || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Grand Total */}
            <Box sx={{ p: 2, borderTop: `2px solid ${brand.gold}`, display: "flex", gap: 4 }}>
              <Typography fontWeight={700} sx={{ color: brand.ink }}>
                Entries: {allocations.length}
              </Typography>
              <Typography fontWeight={700} sx={{ color: "#A24BD1" }}>
                Total Allocated: Rs. {totalAllocated.toLocaleString()}
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
            .no-print { display: none !important; }
          }
        `}</style>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
