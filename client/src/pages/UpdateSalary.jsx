import { useState } from "react";
import { useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import { useToast } from "../utils/useToast";
import { getActiveEmployees } from "../api/payrollApi";
import DateFieldDMY from "../components/DateFieldDMY";

import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { brand, gradients, shadowCard } from "../theme";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function daysInMonth(monthName, year) {
  const idx = MONTHS.indexOf(monthName);
  if (idx === -1 || !year) return 30;
  return new Date(Number(year), idx + 1, 0).getDate();
}

function monthBounds(monthName, year) {
  const idx = MONTHS.indexOf(monthName);
  const total = daysInMonth(monthName, year);
  const start = `${year}-${pad2(idx + 1)}-01`;
  const end = `${year}-${pad2(idx + 1)}-${pad2(total)}`;
  return { start, end, total };
}

function parseIso(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function periodBreakdown(fromIso, toIso) {
  const from = parseIso(fromIso);
  const to = parseIso(toIso);
  if (!from || !to) return { days: 0, factor: 0 };

  const start = new Date(from.y, from.m - 1, from.d);
  const end = new Date(to.y, to.m - 1, to.d);
  if (end < start) return { days: 0, factor: 0 };

  let days = 0;
  let factor = 0;

  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();

    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m, dim);

    const segStart = start > monthStart ? start : monthStart;
    const segEnd = end < monthEnd ? end : monthEnd;

    if (segStart <= segEnd) {
      const segDays = Math.round((segEnd - segStart) / 86400000) + 1;
      days += segDays;
      factor += segDays >= dim ? 1 : segDays / dim;
    }

    cursor = new Date(y, m + 1, 1);
  }

  return { days, factor };
}

const JOINING_RULE_CUTOVER = "2026-07-01";

export default function UpdateSalary() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();

  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noEmployees, setNoEmployees] = useState(false);

  const loadEmployees = async () => {
    setLoading(true);
    setNoEmployees(false);
    try {
      const res = await getActiveEmployees();
      const employees = res.data || [];

      if (employees.length === 0) {
        setRows([]);
        setNoEmployees(true);
        localStorage.removeItem("salaryDraft");
        showToast("No active employees found. Please add employees first.", "warning");
        setLoading(false);
        return;
      }

      const { start: monthStart, end: monthEnd } = monthBounds(month, year);

      const periodStart = fromDate || monthStart;
      const periodEnd = toDate || monthEnd;

      const built = employees.map((emp) => {
        const gross = Number(emp.grossSalary || 0);

        const joinsMidPeriod =
          emp.joiningDate &&
          emp.joiningDate >= JOINING_RULE_CUTOVER &&
          emp.joiningDate > periodStart &&
          emp.joiningDate <= periodEnd;

        const effectiveStart = joinsMidPeriod ? emp.joiningDate : periodStart;
        const effectiveEnd = periodEnd;

        const { days, factor } = periodBreakdown(effectiveStart, effectiveEnd);

        return {
          id: emp.id,
          employeeId: emp.id,
          employeeNo: emp.employeeNo,
          employeeName: emp.name,
          department: emp.department,
          appointment: emp.appointment,
          bankName: emp.bankName,
          iban: emp.iban,
          remarks: emp.remarks || "",
          joiningDate: emp.joiningDate || "",
          grossSalary: gross,
          fromDate: effectiveStart,
          toDate: effectiveEnd,
          days,
          factor,
          arrear: 0,
          netSalary: Math.round(gross * factor),
        };
      });

      setRows(built);
      showToast(`${built.length} active employee(s) loaded`, "success");
    } catch (err) {
      console.error(err);
      showToast("Could not load employees", "error");
    } finally {
      setLoading(false);
    }
  };

  const recalcRow = (row) => ({
    ...row,
    netSalary: Math.round(Number(row.grossSalary || 0) * Number(row.factor || 0)) + Number(row.arrear || 0),
  });

  const updateRowDate = (id, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        const { days, factor } = periodBreakdown(updated.fromDate, updated.toDate);
        updated.days = days;
        updated.factor = factor;
        return recalcRow(updated);
      })
    );
  };

  const updateDays = (id, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const d = Number(value || 0);
        const base = parseIso(r.fromDate) || parseIso(monthBounds(month, year).start);
        const dim = base ? new Date(base.y, base.m, 0).getDate() : daysInMonth(month, year);
        return recalcRow({ ...r, days: d, factor: d / dim });
      })
    );
  };

  const updateArrear = (id, value) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? recalcRow({ ...r, arrear: Number(value || 0) }) : r))
    );
  };

  const updateRemarks = (id, value) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, remarks: value } : r)));
  };

  const saveDraftAndContinue = () => {
    if (rows.length === 0) {
      showToast("Load employees first", "error");
      return;
    }
    const farm = localStorage.getItem("farm");
    localStorage.setItem(
      "salaryDraft",
      JSON.stringify({ farm, month, year, rows, savedAt: Date.now() })
    );
    showToast("Draft saved — continue in Generate Salary", "success");
    navigate("/salary/generate");
  };

  // --- Columns: Remarks comes RIGHT AFTER Net Salary (Amount) ---
  const columns = [
    { field: "employeeNo", headerName: "Emp No", width: 100 },
    { field: "employeeName", headerName: "Name", flex: 1.4, minWidth: 150 },
    { field: "department", headerName: "Department", flex: 1, minWidth: 120 },
    { field: "grossSalary", headerName: "Gross Salary", width: 120, type: "number" },
    {
      field: "fromDate",
      headerName: "From Date",
      width: 150,
      renderCell: (params) => (
        <DateFieldDMY
          size="small"
          value={params.row.fromDate}
          onChange={(e) => updateRowDate(params.row.id, "fromDate", e.target.value)}
          sx={{ width: 135 }}
        />
      ),
    },
    {
      field: "toDate",
      headerName: "To Date",
      width: 150,
      renderCell: (params) => (
        <DateFieldDMY
          size="small"
          value={params.row.toDate}
          onChange={(e) => updateRowDate(params.row.id, "toDate", e.target.value)}
          sx={{ width: 135 }}
        />
      ),
    },
    {
      field: "days",
      headerName: "Days",
      width: 90,
      renderCell: (params) => (
        <TextField
          size="small"
          type="number"
          value={params.row.days}
          onChange={(e) => updateDays(params.row.id, e.target.value)}
          sx={{ width: 75 }}
        />
      ),
    },
    {
      field: "arrear",
      headerName: "Arrear/Recovery",
      width: 150,
      renderCell: (params) => (
        <TextField
          size="small"
          type="number"
          value={params.row.arrear}
          onChange={(e) => updateArrear(params.row.id, e.target.value)}
          helperText="- for recovery"
          sx={{ width: 125 }}
        />
      ),
    },
    { field: "netSalary", headerName: "Net Salary (Amount)", width: 150, type: "number" },
    {
      field: "remarks",
      headerName: "Remarks",
      width: 220,
      renderCell: (params) => (
        <TextField
          size="small"
          placeholder="Enter remarks"
          value={params.row.remarks || ""}
          onChange={(e) => updateRemarks(params.row.id, e.target.value)}
          sx={{ width: 190 }}
        />
      ),
    },
  ];

  const totalNet = rows.reduce((sum, r) => sum + Number(r.netSalary || 0), 0);

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>SALARY WORKSPACE</Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>Update Salary</Typography>
        <Typography color="text.secondary" mb={3}>
          Set the pay period, load active employees, then adjust each employee's dates, days, remarks or arrear/recovery individually if needed.
        </Typography>

        {/* Premium summary cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[
            { label: "Employees Loaded", value: rows.length, grad: "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)" },
            { label: "Month/Year", value: `${month} ${year}`, grad: "linear-gradient(135deg, #2FBF71 0%, #1B8A50 100%)" },
            { label: "Total Net Payable", value: `Rs. ${totalNet.toLocaleString()}`, grad: "linear-gradient(135deg, #A24BD1 0%, #7A1FA2 100%)" },
          ].map((c) => (
            <Grid item xs={4} key={c.label}>
              <Box sx={{
                borderRadius: 4, background: c.grad, color: "#fff", p: 3, textAlign: "center",
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

        <Card sx={{ borderRadius: 3, boxShadow: shadowCard, mb: 3, background: "#f0f4fa", border: "1px solid rgba(15,76,129,0.14)" }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={2.4}>
                <TextField fullWidth select label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
                  {MONTHS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={1.8}>
                <TextField fullWidth label="Year" value={year} onChange={(e) => setYear(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={2.6}>
                <DateFieldDMY label="From Date (optional)" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={2.6}>
                <DateFieldDMY label="To Date (optional)" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </Grid>
              <Grid item xs={12} md={2.6}>
                <Button
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  startIcon={<CloudDownloadIcon />}
                  sx={{ height: 56, background: gradients.brand }}
                  onClick={loadEmployees}
                >
                  {loading ? "Loading..." : "Load Employee"}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {noEmployees && (
          <Card sx={{ borderRadius: 3, boxShadow: shadowCard, mb: 3, background: "#FFF3CD", border: "1px solid #FFC107" }}>
            <CardContent>
              <Typography fontWeight={700} color="#856404">
                {"\u26A0\uFE0F"} No active employees found in the system.
              </Typography>
              <Typography color="#856404" sx={{ mt: 1 }}>
                Please add employees first before loading salary data.
              </Typography>
              <Button variant="contained" sx={{ mt: 2, background: gradients.brand }} onClick={() => navigate("/employees/add")}>
                Add Employee
              </Button>
            </CardContent>
          </Card>
        )}

        <Card sx={{ borderRadius: 3, boxShadow: shadowCard, background: "#f0f4fa", border: "1px solid rgba(15,76,129,0.14)" }}>
          <CardContent>
            <Box sx={{ height: 520 }}>
              <DataGrid
                rows={rows}
                columns={columns}
                pageSizeOptions={[10, 25]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                sx={{ border: 0, "& .MuiDataGrid-cell": { background: "#f7f9fc" } }}
                rowHeight={64}
              />
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button
                variant="contained"
                disabled={rows.length === 0}
                sx={{ background: gradients.brand, px: 4 }}
                onClick={saveDraftAndContinue}
              >
                Save &amp; Continue to Generate Salary →
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
