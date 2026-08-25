import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Typography, Button } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MainLayout from "../layouts/MainLayout";
import EmployeeForm from "../components/Employee/EmployeeForm";
import { getEmployee, updateEmployee } from "../api/employeeApi";
import { useToast } from "../utils/useToast";
import { brand, gradients } from "../theme";

export default function EditEmployee() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();
  const [formData, setFormData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadEmployee(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const loadEmployee = async () => {
    try { const res = await getEmployee(id); setFormData(res.data); }
    catch (err) { console.error(err); showToast("Unable to load employee", "error"); }
  };
  const handleUpdate = async () => {
    setSaving(true);
    try {
      await updateEmployee(id, formData);
      showToast("Employee updated successfully", "success");
      setTimeout(() => navigate("/employees/list"), 800);
    } catch (err) { console.error(err); showToast("Update failed", "error"); }
    finally { setSaving(false); }
  };

  return (
    <MainLayout>
      <Box sx={{ px: { xs: 1, sm: 1.5, md: 1.75 }, pt: 1, pb: 4, width: "100%", maxWidth: 1440, mx: "auto", minWidth: 0, overflowX: "hidden" }}>
        <Box sx={{ mb: 1.2 }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", border: "1px solid #c9a227", borderRadius: 999, px: 1.25, py: .3, mb: .35, background: "transparent" }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.25, color: "#a27b00", lineHeight: 1.1 }}>EDIT RECORD</Typography>
          </Box>
          <Typography sx={{ fontSize: { xs: 25, md: 29 }, fontWeight: 400, lineHeight: 1.1, color: "#14213d" }}>Edit Employee</Typography>
          <Typography sx={{ mt: .25, fontSize: 14, color: "#26384e" }}>Update employee information below.</Typography>
        </Box>
        {!formData && <Typography color="text.secondary">Loading...</Typography>}
        {formData && <>
          <EmployeeForm formData={formData} setFormData={setFormData} />
          <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end", gap: 1.2, flexWrap: "wrap" }}>
            <Button variant="outlined" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate("/employees/list")}>Cancel</Button>
            <Button variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={handleUpdate} sx={{ background: gradients.brand }}>{saving ? "Updating..." : "Update Employee"}</Button>
          </Box>
        </>}
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
