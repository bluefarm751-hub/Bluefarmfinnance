import { Fragment, useEffect, useState } from "react";
import MainLayout from "../layouts/MainLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../utils/useToast";
import { getSalaryBatches, getBatchEmployees, undoSalary, undoEmployeeSalary } from "../api/payrollApi";
import { Box, Card, CardContent, Typography, Button, Collapse, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, IconButton } from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { brand, shadowCard } from "../theme";

const undoTableSx = { width: "100%", borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed" };
const undoHeaderSx = {
  background: `${brand.tableCardBg} !important`,
  "& .MuiTableCell-root": { background: `${brand.tableCardBg} !important`, color: `${brand.tableCardHeaderText} !important`, fontWeight: 800, borderBottom: `2px solid ${brand.gold}`, borderRight: "1px solid rgba(255,255,255,0.14)", py: 1.55, px: 1.5, whiteSpace: "nowrap" },
  "& .MuiTableCell-root:last-of-type": { borderRight: "none" },
};
const undoRowSx = (i) => ({
  background: i % 2 === 0 ? `${brand.rowBlue} !important` : `${brand.rowWhiteGradient} !important`,
  "& .MuiTableCell-root": { color: `${i % 2 === 0 ? brand.rowText : brand.rowTextOnWhite} !important`, background: `${i % 2 === 0 ? brand.rowBlue : "#f7fbff"} !important`, borderBottom: "1px solid rgba(8,33,63,0.14)", borderRight: "1px solid rgba(8,33,63,0.10)", px: 1.5, py: 1.25, fontSize: 14, whiteSpace: "normal", wordBreak: "break-word" },
  "& .MuiTableCell-root:last-of-type": { borderRight: "none" },
  "&:hover .MuiTableCell-root": { background: `${brand.goldLight} !important`, color: `${brand.rowText} !important` },
});

export default function UndoSalary() {
  const { showToast, ToastUI } = useToast();
  const [batches, setBatches] = useState([]), [confirmBatch, setConfirmBatch] = useState(null), [confirmEmployee, setConfirmEmployee] = useState(null), [loading, setLoading] = useState(true), [expandedKey, setExpandedKey] = useState(null), [batchEmployees, setBatchEmployees] = useState([]), [loadingEmployees, setLoadingEmployees] = useState(false);
  useEffect(() => { loadBatches(); }, []);
  const loadBatches = async () => { setLoading(true); try { const res = await getSalaryBatches(); setBatches(res.data); } catch (err) { console.error(err); showToast("Could not load salary batches", "error"); } finally { setLoading(false); } };
  const batchKey = (b) => `${b.farm}-${b.month}-${b.year}`;
  const toggleExpand = async (b) => {
    const key = batchKey(b); if (expandedKey === key) { setExpandedKey(null); return; }
    setExpandedKey(key); setLoadingEmployees(true);
    try { const res = await getBatchEmployees(b.month, b.year); setBatchEmployees(res.data); }
    catch (err) { console.error(err); showToast("Could not load employees for this batch", "error"); }
    finally { setLoadingEmployees(false); }
  };
  const handleUndo = async () => { const batch = confirmBatch; setConfirmBatch(null); try { await undoSalary(batch.month, batch.year); showToast(`Salary for ${batch.month} ${batch.year} undone`, "success"); setExpandedKey(null); loadBatches(); } catch (err) { console.error(err); showToast("Could not undo this salary batch", "error"); } };
  const handleUndoEmployee = async () => { const target = confirmEmployee; setConfirmEmployee(null); try { await undoEmployeeSalary(target.payrollId); showToast(`Salary for ${target.name} undone`, "success"); setBatchEmployees((prev) => prev.filter((e) => e.id !== target.payrollId)); loadBatches(); } catch (err) { console.error(err); showToast("Could not undo this employee's salary", "error"); } };
  const totalBatches = batches.length, totalEmployees = batches.reduce((s, b) => s + Number(b.employeeCount || 0), 0), totalAmount = batches.reduce((s, b) => s + Number(b.totalNet || 0), 0);

  return (
    <MainLayout>
      <Box sx={{ px: { xs: 1.5, md: 3 }, pt: 1, pb: 3, width: "100%", maxWidth: 1400, mx: "auto", minWidth: 0, overflowX: "hidden" }}>
        <Box sx={{ display: "inline-flex", alignItems: "center", px: 1.6, py: 0.4, borderRadius: 10, background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`, fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2 }}>PAYROLL CORRECTIONS</Box>
        <Typography variant="h4" fontWeight="bold" mb={0.7}>Undo Salary</Typography>
        <Typography color="text.secondary" mb={2.5}>Undo an entire generated batch, or expand it to undo a single employee's salary entry only.</Typography>

        <Grid container spacing={2} sx={{ mb: 2.5 }}>
          {[
            { label: "Generated Batches", value: totalBatches, grad: "radial-gradient(120% 100% at 50% 0%, #6EC1FF 0%, #1E88E5 45%, #0D47A1 100%)" },
            { label: "Total Employees", value: totalEmployees, grad: "radial-gradient(120% 100% at 50% 0%, #6EE7A8 0%, #2FBF71 45%, #145C36 100%)" },
            { label: "Total Amount", value: `Rs. ${totalAmount.toLocaleString()}`, grad: "radial-gradient(120% 100% at 50% 0%, #D68FFF 0%, #A24BD1 45%, #5B1075 100%)" },
          ].map((c) => <Grid item xs={12} sm={4} key={c.label}><Box sx={{ borderRadius: 3, background: c.grad, color: "#fff", p: 2.2, minHeight: 102, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", boxShadow: `${shadowCard}, inset 0 2px 6px rgba(255,255,255,0.35), inset 0 -12px 20px rgba(0,0,0,0.25)`, border: "1px solid rgba(255,255,255,0.25)" }}><Typography fontSize={12} fontWeight={600} sx={{ opacity: 0.9 }}>{c.label}</Typography><Typography variant="h5" fontWeight="bold">{c.value}</Typography></Box></Grid>)}
        </Grid>

        {!loading && batches.length === 0 && <Card sx={{ borderRadius: 2.5, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,0.14)" }}><CardContent sx={{ textAlign: "center", py: 5 }}><Typography color="text.secondary">No generated salary batches found yet.</Typography></CardContent></Card>}

        {batches.length > 0 && <Card elevation={0} sx={{ width: "100%", borderRadius: 2, boxShadow: shadowCard, border: "1px solid rgba(15,76,129,0.14)", overflow: "hidden" }}>
          <CardContent sx={{ p: 1.2, "&:last-child": { pb: 1.2 } }}>
            <TableContainer sx={{ width: "100%" }}>
              <Table sx={undoTableSx} aria-label="salary batches table">
                <TableHead><TableRow sx={undoHeaderSx}><TableCell sx={{ width: "18%" }}>Batch</TableCell><TableCell sx={{ width: "18%" }}>Employees</TableCell><TableCell sx={{ width: "18%" }}>Total Amount</TableCell><TableCell align="right" sx={{ width: "46%" }}>Actions</TableCell></TableRow></TableHead>
                <TableBody>
                  {batches.map((b, i) => {
                    const key = batchKey(b), isExpanded = expandedKey === key;
                    return <Fragment key={key}>
                      <TableRow hover sx={undoRowSx(i)}>
                        <TableCell sx={{ fontWeight: 700 }}>{b.month} {b.year}</TableCell><TableCell>{b.employeeCount} employee(s)</TableCell><TableCell sx={{ fontWeight: 700 }}>Rs. {Number(b.totalNet || 0).toLocaleString()}</TableCell>
                        <TableCell align="right"><Box sx={{ display: "flex", gap: 0.8, justifyContent: "flex-end", alignItems: "center" }}>
                          <Tooltip title={isExpanded ? "Hide Employees" : "View Employees to Undo Individually"}><IconButton size="small" onClick={() => toggleExpand(b)} sx={{ width: 32, height: 32, background: brand.blueDeep, color: "#fff", "&:hover": { background: brand.navy } }}>{isExpanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}</IconButton></Tooltip>
                          <Tooltip title="Undo Full Batch"><IconButton size="small" onClick={() => setConfirmBatch(b)} sx={{ width: 32, height: 32, background: brand.danger, color: "#fff", "&:hover": { background: "#8e281c" } }}><UndoIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip>
                        </Box></TableCell>
                      </TableRow>
                      <TableRow><TableCell colSpan={4} sx={{ p: 0, border: 0, background: brand.panel }}>
                        <Collapse in={isExpanded} unmountOnExit><Box sx={{ p: { xs: 1.2, md: 1.6 }, background: "#e6f1fb" }}>
                          {loadingEmployees && <Typography color="text.secondary" sx={{ py: 1 }}>Loading employees...</Typography>}
                          {!loadingEmployees && batchEmployees.length === 0 && <Typography color="text.secondary" sx={{ py: 1 }}>No employees left in this batch.</Typography>}
                          {!loadingEmployees && batchEmployees.length > 0 && <TableContainer sx={{ width: "100%", border: "1px solid rgba(15,76,129,0.14)", borderRadius: 1.5, overflow: "hidden", background: "#fff" }}>
                            <Table sx={undoTableSx} aria-label="batch employees table">
                              <TableHead><TableRow sx={undoHeaderSx}><TableCell sx={{ width: "34%" }}>Employee Name</TableCell><TableCell sx={{ width: "22%" }}>Employee No</TableCell><TableCell sx={{ width: "20%" }}>Net Salary</TableCell><TableCell sx={{ width: "24%" }} align="right">Actions</TableCell></TableRow></TableHead>
                              <TableBody>{batchEmployees.map((emp, j) => <TableRow key={emp.id} hover sx={undoRowSx(j)}><TableCell sx={{ fontWeight: 700 }}>{emp.employeeName}</TableCell><TableCell>{emp.employeeNo}</TableCell><TableCell sx={{ fontWeight: 600 }}>Rs. {Number(emp.netSalary || 0).toLocaleString()}</TableCell><TableCell align="right"><Tooltip title="Undo Employee Salary"><IconButton size="small" onClick={() => setConfirmEmployee({ payrollId: emp.id, name: emp.employeeName, batch: b })} sx={{ width: 32, height: 32, background: brand.danger, color: "#fff", "&:hover": { background: "#8e281c" } }}><UndoIcon sx={{ fontSize: 17 }} /></IconButton></Tooltip></TableCell></TableRow>)}</TableBody>
                            </Table>
                          </TableContainer>}
                        </Box></Collapse>
                      </TableCell></TableRow>
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
