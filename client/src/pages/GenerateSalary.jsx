import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import { useToast } from "../utils/useToast";
import { generateSalary, checkBatchExists, getActiveEmployees } from "../api/payrollApi";

import { Box, Card, CardContent, Typography, Button, Chip, Grid } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import BoltIcon from "@mui/icons-material/Bolt";
import { brand, gradients, shadowCard, dataGridThemeSx } from "../theme";

export default function GenerateSalary() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();

  const [draft, setDraft] = useState(null);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [draftStale, setDraftStale] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("salaryDraft");
    if (raw) {
      const parsed = JSON.parse(raw);

      getActiveEmployees()
        .then((res) => {
          const activeCount = (res.data || []).length;
          if (activeCount === 0) {
            localStorage.removeItem("salaryDraft");
            setDraftStale(true);
            setDraft(null);
          } else {
            setDraft(parsed);
            checkBatchExists(parsed.month, parsed.year)
              .then((r) => setAlreadyGenerated(r.data.exists))
              .catch(() => {});
          }
        })
        .catch(() => {
          setDraft(parsed);
          checkBatchExists(parsed.month, parsed.year)
            .then((r) => setAlreadyGenerated(r.data.exists))
            .catch(() => {});
        });
    }
  }, []);

  const handleGenerate = async () => {
    if (!draft) return;
    setGenerating(true);
    try {
      await generateSalary(draft.month, draft.year, draft.rows);
      showToast("Salary generated successfully", "success");
      setDone(true);
      localStorage.removeItem("salaryDraft");
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Could not generate salary", "error");
    } finally {
      setGenerating(false);
    }
  };

  const columns = [
    { field: "employeeNo", headerName: "Emp No", width: 100 },
    { field: "employeeName", headerName: "Name", flex: 1.6 },
    { field: "department", headerName: "Department", flex: 1.2 },
    { field: "grossSalary", headerName: "Gross Salary", width: 130, type: "number" },
    { field: "days", headerName: "Days", width: 90, type: "number" },
    { field: "arrear", headerName: "Arrear/Recovery", width: 150, type: "number" },
    { field: "netSalary", headerName: "Net Salary", width: 140, type: "number" },
  ];

  const totalNet = draft?.rows?.reduce((sum, r) => sum + Number(r.netSalary || 0), 0) || 0;

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 3 }}>
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>FINALIZE PAYROLL
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>Generate Salary</Typography>
        <Typography color="text.secondary" mb={3}>
          Review the salary batch prepared in Update Salary, then generate it. Nothing here can be edited.
        </Typography>

        {/* Stale draft warning */}
        {draftStale && (
          <Card sx={{ borderRadius: 3, boxShadow: shadowCard, mb: 3, background: "#FFF3CD", border: "1px solid #FFC107" }}>
            <CardContent>
              <Typography fontWeight={700} color="#856404">
                {"\u26A0\uFE0F"} No employees found in the system. Any previously saved salary draft has been cleared.
              </Typography>
              <Typography color="#856404" sx={{ mt: 1 }}>
                Please add employees first, then prepare salary in Update Salary.
              </Typography>
              <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
                <Button variant="contained" sx={{ background: gradients.brand }} onClick={() => navigate("/employees/add")}>
                  Add Employee
                </Button>
                <Button variant="outlined" onClick={() => navigate("/salary/update")}>
                  Go to Update Salary
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* No draft at all */}
        {!draft && !draftStale && (
          <Card sx={{ borderRadius: 3, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,0.14)" }}>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <Typography color="text.secondary" mb={2}>
                No salary draft found. Please prepare one in Update Salary first.
              </Typography>
              <Button variant="contained" sx={{ background: gradients.brand }} onClick={() => navigate("/salary/update")}>
                Go to Update Salary
              </Button>
            </CardContent>
          </Card>
        )}

        {draft && (
          <>
            {/* Premium summary cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {[
                { label: "Period", value: `${draft.month} ${draft.year}`, grad: "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)" },
                { label: "Farm", value: draft.farm, grad: "linear-gradient(135deg, #2FBF71 0%, #1B8A50 100%)" },
                { label: "Employees", value: draft.rows.length, grad: "linear-gradient(135deg, #A24BD1 0%, #7A1FA2 100%)" },
                { label: "Total Net Payable", value: `Rs. ${totalNet.toLocaleString()}`, grad: "linear-gradient(135deg, #D9B64A 0%, #B8912C 100%)" },
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

            <Card sx={{ borderRadius: 3, boxShadow: shadowCard, mb: 3, border: "1px solid rgba(15,76,129,0.14)" }}>
              <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  disabled={generating || done || alreadyGenerated}
                  startIcon={<BoltIcon />}
                  sx={{ background: gradients.brand, px: 4 }}
                  onClick={handleGenerate}
                >
                  {done ? "Generated \u2713" : generating ? "Generating..." : "Generate"}
                </Button>
              </CardContent>

              {alreadyGenerated && !done && (
                <CardContent sx={{ pt: 0 }}>
                  <Box sx={{ background: "#FDECEA", color: brand.danger, borderRadius: 2, p: 1.5, fontSize: 13.5, fontWeight: 600 }}>
                    Salary for {draft.month} {draft.year} ({draft.farm}) is already generated. Use "Undo Salary" first if you need to regenerate it.
                  </Box>
                </CardContent>
              )}

              {done && (
                <CardContent sx={{ pt: 0 }}>
                  <Box sx={{ background: "#E9F9EE", color: brand.success, borderRadius: 2, p: 1.5, fontSize: 13.5, fontWeight: 600 }}>
                    Salary generated successfully. View it anytime in Report Salary.
                  </Box>
                </CardContent>
              )}
            </Card>

            <Card sx={{ borderRadius: 3, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,0.14)" }}>
              <CardContent>
                <Box sx={{ height: 500 }}>
                  <DataGrid
                    rows={draft.rows}
                    columns={columns}
                                        getRowHeight={() => "auto"}
                    getRowId={(r) => r.id}
                    pageSizeOptions={[10, 25]}
                    initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                    getRowClassName={(params) => (params.indexRelativeToCurrentPage % 2 === 0 ? "row-even" : "row-odd")}
                    sx={dataGridThemeSx}
                    disableRowSelectionOnClick
                    isCellEditable={() => false}
                  />
                </Box>
              </CardContent>
            </Card>
          </>
        )}
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
