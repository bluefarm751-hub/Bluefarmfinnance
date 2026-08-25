import { Fragment, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../utils/useToast";
import { getSalaryBatches, getBatchEmployees, undoSalary, undoEmployeeSalary } from "../api/payrollApi";
import { Box, Card, CardContent, Typography, Button, Collapse, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, IconButton } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { brand, gradients, shadowCard } from "../theme";

const tableSx = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  tableLayout: "fixed",
  "& .MuiTableCell-root": { fontSize: 13.5 },
};

const headRowSx = {
  background: `${brand.tableCardBg} !important`,
  "& .MuiTableCell-root": {
    background: `${brand.tableCardBg} !important`,
    color: `${brand.tableCardHeaderText} !important`,
    fontWeight: 800,
    borderBottom: `2px solid ${brand.gold}`,
    borderRight: "1px solid rgba(255,255,255,.14)",
    px: 1.2,
    py: 1.35,
    whiteSpace: "nowrap",
  },
  "& .MuiTableCell-root:last-of-type": { borderRight: "none" },
};

const bodyRowSx = (i) => ({
  background: i % 2 === 0 ? brand.rowBlue : "#eef4fb",
  "& .MuiTableCell-root": {
    background: `${i % 2 === 0 ? brand.rowBlue : "#eef4fb"} !important`,
    color: `${i % 2 === 0 ? brand.rowText : brand.rowTextOnWhite} !important`,
    borderBottom: "1px solid rgba(8,33,63,.14)",
    borderRight: "1px solid rgba(8,33,63,.10)",
    px: 1.2,
    py: 1.05,
    whiteSpace: "normal",
    wordBreak: "break-word",
  },
  "& .MuiTableCell-root:last-of-type": { borderRight: "none" },
  "&:hover .MuiTableCell-root": { background: `${brand.goldLight} !important`, color: `${brand.rowText} !important` },
});

function ActionButton({ title, color, onClick, children }) {
  return <Tooltip title={title}><IconButton size="small" onClick={onClick} sx={{ width: 30, height: 30, background: color, color: "#fff", boxShadow: "0 2px 5px rgba(8,33,63,.15)", "&:hover": { filter: "brightness(.9)", background: color } }}>{children}</IconButton></Tooltip>;
}

export default function UndoSalary() {
  const { showToast, ToastUI } = useToast();
  const [batches, setBatches] = useState([]);
  const [confirmBatch, setConfirmBatch] = useState(null);
  const [confirmEmployee, setConfirmEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState(null);
  const [batchEmployees, setBatchEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => { loadBatches(); }, []);
  const loadBatches = async () => {
    setLoading(true);
    try { const res = await getSalaryBatches(); setBatches(res.data); }
    catch (err) { console.error(err); showToast("Could not load salary batches", "error"); }
    finally { setLoading(false); }
  };
  const batchKey = (b) => `${b.farm}-${b.month}-${b.year}`;
  const toggleExpand = async (b) => {
    const key = batchKey(b);
    if (expandedKey === key) { setExpandedKey(null); return; }
    setExpandedKey(key); setLoadingEmployees(true);
    try { const res = await getBatchEmployees(b.month, b.year); setBatchEmployees(res.data); }
    catch (err) { console.error(err); showToast("Could not load employees", "error"); }
    finally { setLoadingEmployees(false); }
  };
  const handleUndo = async () => {
    const b = confirmBatch; setConfirmBatch(null); if (!b) return;
    try { await undoSalary(b.month, b.year); showToast("Salary batch undone successfully", "success"); setExpandedKey(null); loadBatches(); }
    catch (err) { console.error(err); showToast(err.response?.data?.message || "Unable to undo salary batch", "error"); }
  };
  const handleUndoEmployee = async () => {
    const item = confirmEmployee; setConfirmEmployee(null); if (!item) return;
    try { await undoEmployeeSalary(item.payrollId); showToast("Employee salary undone successfully", "success"); await toggleExpand(item.batch); loadBatches(); }
    catch (err) { console.error(err); showToast(err.response?.data?.message || "Unable to undo employee salary", "error"); }
  };

  const totalEmployees = batches.reduce((sum, b) => sum + Number(b.employeeCount || 0), 0);
  const totalAmount = batches.reduce((sum, b) => sum + Number(b.totalNet || 0), 0);

  return (
    <MainLayout>
      <Box sx={{ px: { xs: 1.5, sm: 2.5, md: 3 }, pt: 1.2, pb: 4, width: "100%", maxWidth: "none", mx: 0, minWidth: 0 }}>
        <Box sx={{ display: "inline-flex", alignItems: "center", px: 1.5, py: .35, borderRadius: 99, background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`, fontSize: 10.5, fontWeight: 800, letterSpacing: 1, color: brand.goldDark, mb: .8 }}>PAYROLL CORRECTIONS</Box>
        <Typography variant="h4" fontWeight={500} sx={{ color: brand.ink, mb: .3 }}>Undo Salary</Typography>
        <Typography color="text.secondary" sx={{ mb: 1.6, fontSize: 13.5 }}>Undo a complete generated batch or reverse a single employee salary entry.</Typography>

        <Grid container spacing={1.4} sx={{ mb: 2.2 }}>
          {[
            { label: "Generated Batches", value: batches.length, grad: "radial-gradient(120% 100% at 50% 0%, #69c9ff 0%, #1889d8 45%, #0f4c81 100%)" },
            { label: "Total Employees", value: totalEmployees, grad: "radial-gradient(120% 100% at 50% 0%, #72e6a8 0%, #24ad67 45%, #176341 100%)" },
            { label: "Total Amount", value: `Rs. ${totalAmount.toLocaleString()}`, grad: "radial-gradient(120% 100% at 50% 0%, #d79cff 0%, #9e4bca 45%, #5f1679 100%)" },
          ].map((c) => (
            <Grid item xs={12} sm={4} key={c.label}>
              <Box sx={{ borderRadius: 2.2, background: c.grad, color: "#fff", px: 2, py: 1.5, minHeight: 88, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", boxShadow: "0 10px 24px rgba(8,33,63,.16), inset 0 2px 5px rgba(255,255,255,.35), inset 0 -9px 16px rgba(0,0,0,.20)", border: "1px solid rgba(255,255,255,.25)" }}>
                <Typography fontSize={11.5} sx={{ opacity: .92 }}>{c.label}</Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{c.value}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {!loading && batches.length === 0 && <Card sx={{ borderRadius: 2, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,.14)" }}><CardContent sx={{ textAlign: "center", py: 5 }}><Typography color="text.secondary">No generated salary batches found yet.</Typography></CardContent></Card>}

        {batches.length > 0 && <Card elevation={0} sx={{ width: "100%", borderRadius: 2, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,.14)", overflow: "hidden", background: brand.panelSoft }}>
          <CardContent sx={{ p: 1.1, "&:last-child": { pb: 1.1 } }}>
            <TableContainer sx={{ width: "100%" }}>
              <Table sx={tableSx} aria-label="salary batches table">
                <TableHead><TableRow sx={headRowSx}><TableCell sx={{ width: "18%" }}>Batch</TableCell><TableCell sx={{ width: "17%" }}>Employees</TableCell><TableCell sx={{ width: "20%" }}>Total Amount</TableCell><TableCell align="right" sx={{ width: "45%" }}>Actions</TableCell></TableRow></TableHead>
                <TableBody>
                  {batches.map((b, i) => {
                    const key = batchKey(b), isExpanded = expandedKey === key;
                    return <Fragment key={key}>
                      <TableRow sx={bodyRowSx(i)}>
                        <TableCell sx={{ fontWeight: 800 }}>{b.month} {b.year}</TableCell>
                        <TableCell>{b.employeeCount} employee(s)</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>Rs. {Number(b.totalNet || 0).toLocaleString()}</TableCell>
                        <TableCell align="right"><Box sx={{ display: "flex", gap: .7, justifyContent: "flex-end", alignItems: "center" }}>
                          <Button size="small" variant="outlined" startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />} onClick={() => toggleExpand(b)} sx={{ height: 30, borderColor: brand.blueDeep, color: brand.blueDeep, fontSize: 11, textTransform: "none", px: 1.1 }}>{isExpanded ? "Hide Employees" : "View Employees"}</Button>
                          <Button size="small" variant="contained" startIcon={<UndoIcon />} onClick={() => setConfirmBatch(b)} sx={{ height: 30, background: brand.danger, fontSize: 11, textTransform: "none", px: 1.1, "&:hover": { background: "#8e281c" } }}>Undo Batch</Button>
                        </Box></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={4} sx={{ p: 0, border: 0, background: brand.panel }}>
                          <Collapse in={isExpanded} unmountOnExit>
                            <Box sx={{ p: 1.2, background: "#dceaf7" }}>
                              {loadingEmployees && <Typography color="text.secondary" sx={{ py: 1 }}>Loading employees...</Typography>}
                              {!loadingEmployees && batchEmployees.length === 0 && <Typography color="text.secondary" sx={{ py: 1 }}>No employees left in this batch.</Typography>}
                              {!loadingEmployees && batchEmployees.length > 0 && <TableContainer sx={{ width: "100%", border: "1px solid rgba(15,76,129,.14)", borderRadius: 1.2, overflow: "hidden" }}>
                                <Table sx={tableSx} aria-label="batch employees table">
                                  <TableHead><TableRow sx={headRowSx}><TableCell sx={{ width: "34%" }}>Employee Name</TableCell><TableCell sx={{ width: "22%" }}>Employee No</TableCell><TableCell sx={{ width: "20%" }}>Net Salary</TableCell><TableCell sx={{ width: "24%" }} align="right">Actions</TableCell></TableRow></TableHead>
                                  <TableBody>{batchEmployees.map((emp, j) => <TableRow key={emp.id} sx={bodyRowSx(j)}>
                                    <TableCell sx={{ fontWeight: 800 }}>{emp.employeeName}</TableCell>
                                    <TableCell>{emp.employeeNo}</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Rs. {Number(emp.netSalary || 0).toLocaleString()}</TableCell>
                                    <TableCell align="right"><Button size="small" variant="contained" startIcon={<UndoIcon sx={{ fontSize: 17 }} />} onClick={() => setConfirmEmployee({ payrollId: emp.id, name: emp.employeeName, batch: b })} sx={{ minWidth: 78, height: 30, px: 1.1, background: brand.danger, color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "none", borderRadius: 1.1, "&:hover": { background: "#8e281c" } }}>Undo</Button></TableCell>
                                  </TableRow>)}</TableBody>
                                </Table>
                              </TableContainer>}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>;
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>}
      </Box>

      <ConfirmDialog open={!!confirmBatch} title="Undo this salary batch?" message={confirmBatch ? `This will permanently delete the generated salary for ${confirmBatch.month} ${confirmBatch.year}. You can regenerate it afterwards.` : ""} confirmLabel="Yes, Undo It" onConfirm={handleUndo} onCancel={() => setConfirmBatch(null)} />
      <ConfirmDialog open={!!confirmEmployee} title="Undo this employee's salary?" message={confirmEmployee ? `This will permanently delete the generated salary entry for ${confirmEmployee.name}. You can regenerate it afterwards.` : ""} confirmLabel="Yes, Undo It" onConfirm={handleUndoEmployee} onCancel={() => setConfirmEmployee(null)} />
      {ToastUI}
    </MainLayout>
  );
}
