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

// Raised white + sky-blue "convex/embossed" row treatment used only on Undo Salary tables.
const undoTableSx = {
  borderCollapse: "separate",
  borderSpacing: "0 8px",
};

const undoBodyRowSx = (i) => ({
  ...tableBodyRowSx(i),
  "& .MuiTableCell-root": {
    color: i % 2 ? brand.rowTextOnWhite : brand.rowText,
    borderBottom: "0",
    borderTop: "1px solid rgba(255,255,255,0.78)",
    borderRight: "0",
    background: "radial-gradient(ellipse 125% 145% at 50% 0%, #ffffff 0%, #f6fbff 32%, #dff2ff 68%, #b7d9ee 100%)",
    boxShadow: "inset 0 2px 6px rgba(255,255,255,0.96), inset 0 -5px 10px rgba(69,128,164,0.16)",
    py: 1.6,
  },
  "& .MuiTableCell-root:first-of-type": {
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    boxShadow: "inset 3px 2px 8px rgba(255,255,255,0.9), inset 0 -5px 10px rgba(69,128,164,0.16), -2px 4px 8px rgba(21,79,116,0.08)",
  },
  "& .MuiTableCell-root:last-of-type": {
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    boxShadow: "inset -3px 2px 8px rgba(255,255,255,0.9), inset 0 -5px 10px rgba(69,128,164,0.16), 2px 4px 8px rgba(21,79,116,0.08)",
  },
  "&:hover .MuiTableCell-root": {
    background: "radial-gradient(ellipse 125% 145% at 50% 0%, #ffffff 0%, #eef9ff 34%, #d2ecfb 70%, #a9d0e8 100%) !important",
    color: `${brand.rowText} !important`,
  },
});

const undoHeaderSx = {
  ...tableHeadRowSx,
  background: "linear-gradient(180deg, #245f8e 0%, #184f7c 100%)",
  "& .MuiTableCell-root": {
    ...tableHeadRowSx["& .MuiTableCell-root"],
    borderBottom: `2px solid ${brand.gold}`,
    py: 1.8,
  },
};

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
            { label: "Generated Batches", value: totalBatches, grad: "radial-gradient(120% 100% at 50% 0%, #6EC1FF 0%, #1E88E5 45%, #0D47A1 100%)" },
            { label: "Total Employees", value: totalEmployees, grad: "radial-gradient(120% 100% at 50% 0%, #6EE7A8 0%, #2FBF71 45%, #145C36 100%)" },
            { label: "Total Amount", value: `Rs. ${totalAmount.toLocaleString()}`, grad: "radial-gradient(120% 100% at 50% 0%, #D68FFF 0%, #A24BD1 45%, #5B1075 100%)" },
          ].map((c) => (
            <Grid item xs={4} key={c.label}>
              <Box sx={{
                borderRadius: 4, background: c.grad, color: "#fff", p: 3, textAlign: "center",
                boxShadow: `${shadowCard}, inset 0 2px 6px rgba(255,255,255,0.35), inset 0 -12px 20px rgba(0,0,0,0.25)`,
                border: "2px solid rgba(255,255,255,0.25)",
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
          <Card elevation={0} sx={{ width: "100%", borderRadius: 0, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,0.14)" }}>
            <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
              <TableContainer>
                <Table sx={undoTableSx}>
                  <TableHead>
                    <TableRow sx={undoHeaderSx}>
                      <TableCell sx={{ fontWeight: 800, py: 1.8 }}>Batch</TableCell>
                      <TableCell sx={{ fontWeight: 800, py: 1.8 }}>Employees</TableCell>
                      <TableCell sx={{ fontWeight: 800, py: 1.8 }}>Total Amount</TableCell>
                      <TableCell sx={{ fontWeight: 800, py: 1.8 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batches.map((b, i) => {
                      const key = batchKey(b);
                      const isExpanded = expandedKey === key;

                      return (
                        <Fragment key={key}>
                          <TableRow hover sx={undoBodyRowSx(i)}>
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
                                    <TableContainer sx={{ borderRadius: 2.5, overflow: "hidden", boxShadow: shadowCard, background: "rgba(255,255,255,0.3)", p: 0.5 }}>
                                      <Table sx={undoTableSx}>
                                        <TableHead>
                                          <TableRow sx={undoHeaderSx}>
                                            <TableCell sx={{ fontWeight: 800, py: 1.6 }}>Employee Name</TableCell>
                                            <TableCell sx={{ fontWeight: 800, py: 1.6 }}>Emp No</TableCell>
                                            <TableCell sx={{ fontWeight: 800, py: 1.6 }}>Net Salary</TableCell>
                                            <TableCell sx={{ fontWeight: 800, py: 1.6 }} align="right">Action</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {batchEmployees.map((emp, j) => (
                                            <TableRow key={emp.id} hover sx={undoBodyRowSx(j)}>
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
