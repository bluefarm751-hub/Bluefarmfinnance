import { useEffect, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { useToast } from "../utils/useToast";
import { getEmployees } from "../api/employeeApi";
import { exportXlsx } from "../utils/xlsxWriter";
import { printDocument, tableHtml } from "../utils/print";

import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import GridOnIcon from "@mui/icons-material/GridOn";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { brand, gradients, shadowCard } from "../theme";

const REPORT_COLUMNS = [
  { key: "__sno", label: "S No", width: 8 },
  { key: "appointment", label: "Appointment", width: 16 },
  { key: "name", label: "Name", width: 20 },
  { key: "fatherName", label: "Father Name", width: 20 },
  { key: "cnic", label: "CNIC No", width: 16 },
  { key: "address", label: "Address", width: 24 },
  { key: "mobile", label: "Mobile No", width: 15 },
  { key: "grossSalary", label: "Pay", width: 12 },
  { key: "remarks", label: "Remarks", width: 20 },
];

export default function ReportInfo() {
  const { showToast, ToastUI } = useToast();
  const [rows, setRows] = useState([]);
  const farm = localStorage.getItem("farm");

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await getEmployees();
      setRows(res.data);
    } catch (err) {
      console.error(err);
      showToast("Could not load employee report", "error");
    }
  };

  const handleExportExcel = async () => {
    if (rows.length === 0) return showToast("Nothing to export", "error");
    await exportXlsx({
      filename: `Employee_Info_Report_${farm}`,
      columns: REPORT_COLUMNS,
      rows,
      title: "Employee Information Report",
      subtitle: farm,
    });
    showToast("Excel file downloaded", "success");
  };

  const handleExportPdf = () => {
    if (rows.length === 0) return showToast("Nothing to export", "error");
    printDocument({
      title: "Employee Information Report",
      subtitle: farm,
      bodyHtml: tableHtml(REPORT_COLUMNS, rows),
      landscape: true,
    });
  };

  const gridColumns = [
    { field: "appointment", headerName: "Appointment", flex: 1.1 },
    { field: "name", headerName: "Name", flex: 1.3 },
    { field: "fatherName", headerName: "Father Name", flex: 1.3 },
    { field: "cnic", headerName: "CNIC No", flex: 1.2 },
    { field: "address", headerName: "Address", flex: 1.6 },
    { field: "mobile", headerName: "Mobile No", flex: 1 },
    { field: "grossSalary", headerName: "Pay", width: 110, type: "number" },
    { field: "remarks", headerName: "Remarks", flex: 1.2 },
  ];

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>EMPLOYEE REPORT
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>Report Info</Typography>
        <Typography color="text.secondary" mb={3}>
          Full employee information list — export to Excel or PDF for record keeping.
        </Typography>

        <Card sx={{ borderRadius: 3, boxShadow: shadowCard, mb: 2, border: "1px solid rgba(15,76,129,0.14)" }}>
          <CardContent sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button variant="outlined" startIcon={<GridOnIcon />} onClick={handleExportExcel}>
              Export Excel
            </Button>
            <Button variant="outlined" color="error" startIcon={<PictureAsPdfIcon />} onClick={handleExportPdf}>
              Export PDF
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,0.14)" }}>
          <CardContent>
            <Box sx={{ height: 600 }}>
              <DataGrid
                rows={rows}
                columns={gridColumns}
                getRowId={(r) => r.id}
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                sx={{ border: 0 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
