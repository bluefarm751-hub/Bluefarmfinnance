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
      <Box sx={{ px: { xs: 1.5, sm: 2.5, md: 3 }, pt: 1, pb: 4, width: "100%", maxWidth: 1160, mx: "auto", minWidth: 0, overflowX: "hidden" }}>
        <Box sx={{ mb: 1.6, px: { xs: 1.5, md: 2.2 }, py: 1.35, borderRadius: 2, background: "linear-gradient(180deg,#0f4c81 0%,#123f68 100%)", color: "#fff", boxShadow: "0 6px 18px rgba(8,33,63,.16)" }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.4, opacity: .82, mb: .25 }}>EDIT RECORD</Typography>
          <Typography sx={{ fontSize: { xs: 24, md: 29 }, fontWeight: 800, lineHeight: 1.1, color: "#fff" }}>Edit Employee</Typography>
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
