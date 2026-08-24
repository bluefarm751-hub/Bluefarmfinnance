import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../utils/useToast";

import { getEmployees, deleteEmployee } from "../api/employeeApi";

import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  InputAdornment,
} from "@mui/material";

import { DataGrid } from "@mui/x-data-grid";

import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { brand, gradients, shadowCard, dataGridThemeSx } from "../theme";

export default function EmployeeList() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    loadEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await getEmployees();
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
      showToast("Could not load employees", "error");
    }
  };

  const handleDeleteConfirmed = async () => {
    const id = confirmId;
    setConfirmId(null);
    try {
      await deleteEmployee(id);
      showToast("Employee deleted successfully", "success");
      loadEmployees();
    } catch (err) {
      console.error(err);
      showToast("Unable to delete employee", "error");
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const term = search.toLowerCase();
    return (
      (emp.name || "").toLowerCase().includes(term) ||
      (emp.employeeNo || "").toLowerCase().includes(term) ||
      (emp.mobile || "").toLowerCase().includes(term) ||
      (emp.cnic || "").toLowerCase().includes(term)
    );
  });

  const columns = [
    { field: "employeeNo", headerName: "Emp No", width: 150 },
    { field: "name", headerName: "Employee Name", flex: 2 },
    { field: "cnic", headerName: "CNIC", flex: 1.3 },
    { field: "appointment", headerName: "Appointment", flex: 1.4 },
    { field: "familyMobile", headerName: "Family Mobile No", flex: 1.4 },
    { field: "mobile", headerName: "Mobile", width: 140 },
    { field: "grossSalary", headerName: "Salary", width: 120, type: "number" },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      renderCell: (params) => (
        <Box sx={{
          px: 1.4, py: 0.4, borderRadius: 10, fontSize: 12, fontWeight: 700,
          color: "#fff",
          background: params.value === "Active" ? brand.success : brand.danger,
          display: "inline-block", mt: "10px",
        }}>
          {params.value}
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0.5, width: "100%", height: "100%" }}>
          <Tooltip title="View">
            <IconButton color="success" size="small" onClick={() => navigate(`/employees/view/${params.row.id}`)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton color="primary" size="small" onClick={() => navigate(`/employees/edit/${params.row.id}`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton color="error" size="small" onClick={() => setConfirmId(params.row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <MainLayout>
      <Box sx={{ width: "100%", p: 3 }}>

        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark,
          mb: 1.2,
        }}>EMPLOYEE RECORDS
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={3}>
          View Employee
        </Typography>

        <Card elevation={0} sx={{ width: "100%", borderRadius: 3, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,0.14)" }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ display: "flex", gap: 1.2, flex: 1, minWidth: 280 }}>
                <TextField
                  placeholder="Search by Name, CNIC, Employee No, or Mobile"
                  size="small"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
                  sx={{ width: "100%", maxWidth: 400 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: brand.slate }} />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  onClick={() => setSearch(searchInput)}
                  sx={{ background: gradients.brand, px: 3, whiteSpace: "nowrap" }}
                >
                  Search
                </Button>
              </Box>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate("/employees/add")}
                sx={{ background: gradients.brand }}
              >
                Add Employee
              </Button>
            </Box>

            <Box sx={{ width: "100%", height: "70vh" }}>
              <DataGrid
                rows={filteredEmployees}
                columns={columns}
                getRowId={(row) => row.id}
                getRowHeight={() => "auto"}
                disableRowSelectionOnClick
                pageSizeOptions={[10, 20, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                getRowClassName={(params) => (params.indexRelativeToCurrentPage % 2 === 0 ? "row-even" : "row-odd")}
                sx={{ width: "100%", ...dataGridThemeSx }}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete this employee?"
        message="Are you sure you want to delete this employee? This action cannot be undone."
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmId(null)}
      />

      {ToastUI}
    </MainLayout>
  );
}
