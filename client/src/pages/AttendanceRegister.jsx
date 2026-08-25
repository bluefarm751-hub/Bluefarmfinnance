import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { useToast } from "../utils/useToast";
import { getAttendanceRegister, saveAttendance } from "../api/payrollApi";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Chip,
  CircularProgress,
  Select,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SaveIcon from "@mui/icons-material/Save";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { brand, gradients, shadowCard, dataGridThemeSx } from "../theme";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS = [
  { value: "", label: "—" },
  { value: "P", label: "P - Present" },
  { value: "A", label: "A - Absent" },
  { value: "L", label: "L - Leave" },
];

function daysInMonth(monthName, year) {
  const idx = MONTHS.indexOf(monthName);
  return new Date(Number(year), idx + 1, 0).getDate();
}

function dateKey(year, month, day) {
  const monthNo = String(MONTHS.indexOf(month) + 1).padStart(2, "0");
  return `${year}-${monthNo}-${String(day).padStart(2, "0")}`;
}


export default function AttendanceRegister() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();
  const now = new Date();
  const [month, setMonth] = useState(MONTHS[now.getMonth()]);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const days = useMemo(() => daysInMonth(month, year), [month, year]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const res = await getAttendanceRegister(month, year);
      const incoming = (res.data || []).map((employee) => {
        const map = {};
        for (const item of employee.attendance || []) map[item.date] = item.status;
        const row = {
          id: employee.id,
          employeeNo: employee.employeeNo,
          employeeName: employee.name,
          department: employee.department || "",
          present: Number(employee.present || 0),
          absent: Number(employee.absent || 0),
          leave: Number(employee.leave || 0),
          hasAttendance: Boolean(employee.hasAttendance),
          attendance: map,
        };
        for (let d = 1; d <= days; d += 1) row[`d${d}`] = map[dateKey(year, month, d)] || "";
        return row;
      });
      setRows(incoming);
      if (!incoming.length) showToast("No active employees found for this farm.", "warning");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Could not load attendance", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const setStatus = (id, day, value) => {
    setRows((prev) => prev.map((row) => {
      if (row.id !== id) return row;
      return { ...row, [`d${day}`]: value };
    }));
  };

  const summarize = (row) => {
    let present = 0; let absent = 0; let leave = 0;
    for (let d = 1; d <= days; d += 1) {
      if (row[`d${d}`] === "P") present += 1;
      if (row[`d${d}`] === "A") absent += 1;
      if (row[`d${d}`] === "L") leave += 1;
    }
    return { present, absent, leave, marked: present + absent + leave };
  };

  const saveRow = async (row) => {
    setSavingId(row.id);
    try {
      const records = [];
      for (let d = 1; d <= days; d += 1) {
        const status = row[`d${d}`];
        if (status) records.push({ date: dateKey(year, month, d), status });
      }
      await saveAttendance(month, year, row.id, row.employeeNo, row.employeeName, records);
      const summary = summarize(row);
      setRows((prev) => prev.map((r) => r.id === row.id ? {
        ...r,
        present: summary.present,
        absent: summary.absent,
        leave: summary.leave,
        hasAttendance: summary.marked > 0,
      } : r));
      showToast(`${row.employeeName}: attendance saved`, "success");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Could not save attendance", "error");
    } finally {
      setSavingId(null);
    }
  };

  const summary = useMemo(() => rows.reduce((acc, row) => {
    const s = summarize(row);
    acc.present += s.present;
    acc.absent += s.absent;
    acc.leave += s.leave;
    acc.attendedEmployees += s.marked > 0 ? 1 : 0;
    return acc;
  }, { present: 0, absent: 0, leave: 0, attendedEmployees: 0 }), [rows, days]);

  const columns = [
    { field: "employeeNo", headerName: "Emp No", width: 100, pinned: "left" },
    { field: "employeeName", headerName: "Employee Name", width: 190, pinned: "left" },
    { field: "department", headerName: "Department", width: 140 },
    ...Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      return {
        field: `d${day}`,
        headerName: String(day),
        width: 72,
        sortable: false,
        filterable: false,
        renderHeader: () => <Box sx={{ textAlign: "center", width: "100%" }}><Typography fontSize={12} fontWeight={800}>{day}</Typography></Box>,
        renderCell: (params) => (
          <Select
            size="small"
            value={params.row[`d${day}`] || ""}
            onChange={(e) => setStatus(params.row.id, day, e.target.value)}
            displayEmpty
            sx={{
              minWidth: 62,
              height: 36,
              fontWeight: 800,
              color: params.row[`d${day}`] === "P" ? brand.success : params.row[`d${day}`] === "A" ? brand.danger : params.row[`d${day}`] === "L" ? brand.goldDark : brand.blueDeep,
              "& .MuiSelect-select": { px: 1, py: 0.6 },
            }}
          >
            {STATUS.map((item) => <MenuItem key={item.value || "blank"} value={item.value}>{item.label}</MenuItem>)}
          </Select>
        ),
      };
    }),
    { field: "present", headerName: "P", width: 70, type: "number" },
    { field: "absent", headerName: "A", width: 70, type: "number" },
    { field: "leave", headerName: "L", width: 70, type: "number" },
    {
      field: "save",
      headerName: "Save",
      width: 105,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="contained"
          startIcon={savingId === params.row.id ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
          disabled={savingId !== null}
          onClick={() => saveRow({ ...params.row, ...summarize(params.row) })}
          sx={{ background: gradients.brand, minWidth: 92 }}
        >
          {savingId === params.row.id ? "Saving" : "Save"}
        </Button>
      ),
    },
  ];

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 3 }}>
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>PAYROLL ATTENDANCE</Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>Attendance Register</Typography>
        <Typography color="text.secondary" mb={3}>
          Mark only Present, Absent or Leave. Attendance is optional for payroll — employees with no saved attendance keep the existing salary calculation.
        </Typography>

        <Card sx={{ borderRadius: 3, boxShadow: shadowCard, mb: 3, border: "1px solid rgba(15,76,129,0.14)" }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField select fullWidth size="small" label="Month" value={month} onChange={(e) => setMonth(e.target.value)}>
                  {MONTHS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField fullWidth size="small" label="Year" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />
              </Grid>
              <Grid item xs={12} md={7} sx={{ display: "flex", justifyContent: "flex-end", gap: 1, flexWrap: "wrap" }}>
                <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadAttendance} disabled={loading}>Refresh</Button>
                <Button variant="contained" endIcon={<ArrowForwardIcon />} sx={{ background: gradients.brand }} onClick={() => navigate("/salary/update")}>Continue to Update Salary</Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: "Employees", value: rows.length, bg: gradients.brand },
            { label: "Employees With Attendance", value: summary.attendedEmployees, bg: gradients.blueFarm },
            { label: "Present", value: summary.present, bg: "linear-gradient(135deg, #1E8E5A 0%, #147347 100%)" },
            { label: "Absent / Leave", value: `${summary.absent} / ${summary.leave}`, bg: "linear-gradient(135deg, #8C1B3B 0%, #5C0E22 100%)" },
          ].map((c) => (
            <Grid item xs={6} md={3} key={c.label}>
              <Box sx={{ borderRadius: 3, background: c.bg, color: "#fff", p: 2.2, boxShadow: shadowCard }}>
                <Typography fontSize={12} fontWeight={700} sx={{ opacity: 0.9 }}>{c.label}</Typography>
                <Typography variant="h5" fontWeight="bold">{c.value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Card sx={{ borderRadius: 3, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,0.14)" }}>
          <CardContent>
            <Box sx={{ mb: 1.5, display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip label="P = Present" size="small" sx={{ fontWeight: 800, background: "#E9F9EE", color: brand.success }} />
              <Chip label="A = Absent" size="small" sx={{ fontWeight: 800, background: "#FDECEA", color: brand.danger }} />
              <Chip label="L = Leave" size="small" sx={{ fontWeight: 800, background: `${brand.goldLight}`, color: brand.goldDark }} />
              <Chip label="Blank = No attendance saved" size="small" sx={{ fontWeight: 800, background: brand.panel, color: brand.blueDeep }} />
            </Box>
            <Box sx={{ height: 680, width: "100%" }}>
              <DataGrid
                rows={rows}
                columns={columns}
                loading={loading}
                rowHeight={58}
                columnHeaderHeight={46}
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                getRowClassName={(params) => (params.indexRelativeToCurrentPage % 2 === 0 ? "row-even" : "row-odd")}
                sx={dataGridThemeSx}
                disableRowSelectionOnClick
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
