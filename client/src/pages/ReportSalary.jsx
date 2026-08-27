import { useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { useToast } from "../utils/useToast";
import { getSalaryReport } from "../api/payrollApi";
import { exportXlsx } from "../utils/xlsxWriter";
import { printDocument, tableHtml } from "../utils/print";

import {
  Box, Card, CardContent, Typography, TextField, MenuItem, Button, Grid,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import GridOnIcon from "@mui/icons-material/GridOn";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { brand, gradients, shadowCard, dataGridThemeSx } from "../theme";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const REPORT_COLUMNS = [
  { key: "__sno", label: "S No", width: 8 },
  { key: "appointment", label: "Appointment", width: 18 },
  { key: "employeeName", label: "Name", width: 22 },
  { key: "grossSalary", label: "Gross Pay", width: 14 },
  { key: "days", label: "Days", width: 8 },
  { key: "arrear", label: "Arrear / Recovery", width: 16 },
  { key: "netSalary", label: "Net Pay", width: 14 },
  { key: "bankName", label: "Bank", width: 18 },
  { key: "iban", label: "IBAN", width: 22 },
  { key: "remarks", label: "Remarks", width: 20 },
];

export default function ReportSalary() {
  const { showToast, ToastUI } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [rows, setRows] = useState([]);
  const farm = localStorage.getItem("farm");

  const loadReport = async () => {
    try {
      const res = await getSalaryReport(month, year);
      setRows(res.data);
      if (res.data.length === 0) showToast("No salary records found for this period", "error");
    } catch (err) {
      console.error(err);
      showToast("Could not load salary report", "error");
    }
  };

  const handleExportExcel = async () => {
    if (rows.length === 0) return showToast("Nothing to export", "error");
    await exportXlsx({
      filename: `Salary_Report_${month}_${year}`,
      columns: REPORT_COLUMNS,
      rows,
      title: "Salary Report",
      subtitle: `${farm} \u2022 ${month} ${year}`,
    });
    showToast("Excel file downloaded", "success");
  };

  const handleExportPdf = () => {
    if (rows.length === 0) return showToast("Nothing to export", "error");
    printDocument({
      title: "Salary Report",
      subtitle: `${farm} \u2022 ${month} ${year}`,
      bodyHtml: tableHtml(REPORT_COLUMNS, rows),
      landscape: true,
    });
  };

  const gridColumns = [
    { field: "appointment", headerName: "Appointment", flex: 1.2 },
    { field: "employeeName", headerName: "Name", flex: 1.4 },
    { field: "grossSalary", headerName: "Gross Salary", width: 130, type: "number" },
    { field: "days", headerName: "Days", width: 90, type: "number" },
    { field: "arrear", headerName: "Arrear/Recovery", width: 150, type: "number" },
    { field: "netSalary", headerName: "Net Salary", width: 130, type: "number" },
    { field: "bankName", headerName: "Bank Name", flex: 1 },
    { field: "iban", headerName: "IBAN", flex: 1.2 },
    { field: "remarks", headerName: "Remarks", flex: 1.2 },
  ];

  const totalNet = rows.reduce((sum, r) => sum + Number(r.netSalary || 0), 0);

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 3 }}>
        {/* Premium badge */}
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>PAYROLL REPORTS
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>Report Salary</Typography>
        <Typography color="text.secondary" mb={3}>
          View a generated salary batch and export it to Excel or PDF.
        </Typography>

        {/* Premium summary cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[
            { label: "Employees", value: rows.length, grad: "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)" },
            { label: "Month", value: `${month} ${year}`, grad: "linear-gradient(135deg, #2FBF71 0%, #1B8A50 100%)" },
            { label: "Total Net Payable", value: `Rs. ${totalNet.toLocaleString()}`, grad: "linear-gradient(135deg, #A24BD1 0%, #7A1FA2 100%)" },
            { label: "Farm", value: farm, grad: "linear-gradient(135deg, #D9B64A 0%, #B8912C 100%)" },
          ].map((c) => (
            <Grid item xs={6} md={3} key={c.label}>
              <Box sx={{
                borderRadius: 4, background: c.grad, color: "#fff", p: 3,
                boxShadow: shadowCard, border: "2px solid rgba(255,255,255,0.25)",
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-4px)" },
              }}>
                <Typography fontSize={12} fontWeight={600} sx={{ opacity: 0.9 }}>{c.label}</Typography>
                <Typography variant="h5" fontWeight="bold">{c.value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Filter & Action Card */}
        <Card sx={{ borderRadius: 3, boxShadow: shadowCard, mb: 3, border: "1px solid rgba(15,76,129,0.14)", background: "#f8fafd" }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField fullWidth select label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
                  {MONTHS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth label="Year" value={year} onChange={(e) => setYear(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={2.5}>
                <Button fullWidth variant="contained" startIcon={<SearchIcon />} sx={{ height: 56, background: gradients.brand }} onClick={loadReport}>
                  Load Report
                </Button>
              </Grid>
              <Grid item xs={12} md={2.25}>
                <Button fullWidth variant="outlined" startIcon={<GridOnIcon / className="bf-export-button bf-export-excel">} sx={{ height: 56 }} onClick={handleExportExcel}>
                  Export Excel
                </Button>
              </Grid>
              <Grid item xs={12} md={2.25}>
                <Button fullWidth variant="outlined" color="error" startIcon={<PictureAsPdfIcon / className="bf-export-button bf-export-pdf">} sx={{ height: 56 }} onClick={handleExportPdf}>
                  Export PDF
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card sx={{ borderRadius: 3, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,0.14)" }}>
          <CardContent>
            <Box sx={{ height: 550 }}>
              <DataGrid
                rows={rows}
                columns={gridColumns}
                getRowHeight={() => "auto"}
                getRowId={(r) => r.id}
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                getRowClassName={(params) => (params.indexRelativeToCurrentPage % 2 === 0 ? "row-even" : "row-odd")}
                sx={dataGridThemeSx}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
