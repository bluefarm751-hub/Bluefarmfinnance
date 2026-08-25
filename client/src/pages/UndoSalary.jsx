import { Fragment, useEffect, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../utils/useToast";
import { getSalaryBatches, getBatchEmployees, undoSalary, undoEmployeeSalary } from "../api/payrollApi";

import {
  Box, Card, CardContent, Typography, Button, Collapse, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { brand, shadowCard, tableHeadRowSx, tableBodyRowSx } from "../theme";

export default function UndoSalary() {
  const { showToast, ToastUI } = useToast();
  const [batches, setBatches] = useState([]);
  const [confirmBatch, setConfirmBatch] = useState(null);
  const [confirmEmployee, setConfirmEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const [expandedKey, setExpandedKey] = useState(null);
  const [batchEmployees, setBatchEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const res = await getSalaryBatches();
      setBatches(res.data);
    } catch (err) {
      console.error(err);
      showToast("Could not load salary batches", "error");
    } finally {
      setLoading(false);
    }
  };

  const batchKey = (b) => `${b.farm}-${b.month}-${b.year}`;

  const toggleExpand = async (b) => {
    const key = batchKey(b);

    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }

    setExpandedKey(key);
    setLoadingEmployees(true);
    try {
      const res = await getBatchEmployees(b.month, b.year);
      setBatchEmployees(res.data);
    } catch (err) {
      console.error(err);
      showToast("Could not load employees for this batch", "error");
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleUndo = async () => {
    const batch = confirmBatch;
    setConfirmBatch(null);
    try {
      await undoSalary(batch.month, batch.year);
      showToast(`Salary for ${batch.month} ${batch.year} undone`, "success");
      setExpandedKey(null);
      loadBatches();
    } catch (err) {
      console.error(err);
      showToast("Could not undo this salary batch", "error");
    }
  };

  const handleUndoEmployee = async () => {
    const target = confirmEmployee;
    setConfirmEmployee(null);
    try {
      await undoEmployeeSalary(target.payrollId);
      showToast(`Salary for ${target.name} undone`, "success");
      setBatchEmployees((prev) => prev.filter((e) => e.id !== target.payrollId));
      loadBatches();
    } catch (err) {
      console.error(err);
      showToast("Could not undo this employee's salary", "error");
    }
  };

  const totalBatches = batches.length;
  const totalEmployees = batches.reduce((s, b) => s + Number(b.employeeCount || 0), 0);
  const totalAmount = batches.reduce((s, b) => s + Number(b.totalNet || 0), 0);

  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 3 }}>
        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>PAYROLL CORRECTIONS
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>Undo Salary</Typography>
        <Typography color="text.secondary" mb={3}>
          Undo an entire generated batch, or expand it to undo a single employee's salary entry only.
        </Typography>

        {/* Premium summary cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[
            { label: "Generated Batches", value: totalBatches, grad: "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)" },
            { label: "Total Employees", value: totalEmployees, grad: "linear-gradient(135deg, #2FBF71 0%, #1B8A50 100%)" },
            { label: "Total Amount", value: `Rs. ${totalAmount.toLocaleString()}`, grad: "linear-gradient(135deg, #A24BD1 0%, #7A1FA2 100%)" },
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

        {!loading && batches.length === 0 && (
          <Card sx={{ borderRadius: 3, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,0.14)" }}>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <Typography color="text.secondary">No generated salary batches found yet.</Typography>
            </CardContent>
          </Card>
        )}

        {batches.length > 0 && (
          <Card elevation={0} sx={{ width: "100%", borderRadius: 3, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,0.14)" }}>
            <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={tableHeadRowSx}>
                      <TableCell sx={{ fontWeight: 800 }}>Batch</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Employees</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Total Amount</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batches.map((b, i) => {
                      const key = batchKey(b);
                      const isExpanded = expandedKey === key;

                      return (
                        <Fragment key={key}>
                          <TableRow hover sx={tableBodyRowSx(i)}>
                            <TableCell sx={{ fontWeight: 700 }}>{b.month} {b.year}</TableCell>
                            <TableCell>{b.employeeCount} employee(s)</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Rs. {Number(b.totalNet || 0).toLocaleString()}</TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                  onClick={() => toggleExpand(b)}
                                  sx={{ whiteSpace: "nowrap" }}
                                >
                                  {isExpanded ? "Hide Employees" : "Undo Single Employee"}
                                </Button>

                                <Button
                                  size="small"
                                  variant="contained"
                                  color="error"
                                  startIcon={<UndoIcon fontSize="small" />}
                                  onClick={() => setConfirmBatch(b)}
                                  sx={{ whiteSpace: "nowrap" }}
                                >
                                  Undo Full Batch
                                </Button>
                              </Box>
                            </TableCell>
                          </TableRow>

                          <TableRow>
                            <TableCell colSpan={4} sx={{ p: 0, border: 0 }}>
                              <Collapse in={isExpanded}>
                                <Box sx={{ px: 2, py: 2, background: "rgba(15,76,129,0.05)" }}>
                                  {loadingEmployees && (
                                    <Typography color="text.secondary" sx={{ py: 1 }}>Loading employees...</Typography>
                                  )}

                                  {!loadingEmployees && batchEmployees.length === 0 && (
                                    <Typography color="text.secondary" sx={{ py: 1 }}>No employees left in this batch.</Typography>
                                  )}

                                  {!loadingEmployees && batchEmployees.length > 0 && (
                                    <TableContainer sx={{ borderRadius: 2, overflow: "hidden", boxShadow: shadowCard }}>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow sx={tableHeadRowSx}>
                                            <TableCell sx={{ fontWeight: 800 }}>Employee Name</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Emp No</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }}>Net Salary</TableCell>
                                            <TableCell sx={{ fontWeight: 800 }} align="right">Action</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {batchEmployees.map((emp, j) => (
                                            <TableRow key={emp.id} hover sx={tableBodyRowSx(j)}>
                                              <TableCell sx={{ fontWeight: 700 }}>{emp.employeeName}</TableCell>
                                              <TableCell>{emp.employeeNo}</TableCell>
                                              <TableCell>Rs. {Number(emp.netSalary || 0).toLocaleString()}</TableCell>
                                              <TableCell align="right">
                                                <Button
                                                  size="small"
                                                  variant="outlined"
                                                  color="error"
                                                  startIcon={<UndoIcon fontSize="small" />}
                                                  onClick={() => setConfirmEmployee({ payrollId: emp.id, name: emp.employeeName, batch: b })}
                                                  sx={{ whiteSpace: "nowrap", background: "rgba(255,255,255,0.6)" }}
                                                >
                                                  Undo
                                                </Button>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  )}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        )}
      </Box>

      <ConfirmDialog
        open={!!confirmBatch}
        title="Undo this salary batch?"
        message={confirmBatch ? `This will permanently delete the generated salary for ${confirmBatch.month} ${confirmBatch.year}. You can regenerate it afterwards.` : ""}
        confirmLabel="Yes, Undo It"
        onConfirm={handleUndo}
        onCancel={() => setConfirmBatch(null)}
      />

      <ConfirmDialog
        open={!!confirmEmployee}
        title="Undo this employee's salary?"
        message={confirmEmployee ? `This will permanently delete the generated salary entry for ${confirmEmployee.name}. You can regenerate it afterwards.` : ""}
        confirmLabel="Yes, Undo It"
        onConfirm={handleUndoEmployee}
        onCancel={() => setConfirmEmployee(null)}
      />

      {ToastUI}
    </MainLayout>
  );
}
