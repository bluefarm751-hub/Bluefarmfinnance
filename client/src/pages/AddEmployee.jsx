import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MainLayout from "../layouts/MainLayout";
import EmployeeForm from "../components/Employee/EmployeeForm";
import { addEmployee } from "../api/employeeApi";
import { useToast } from "../utils/useToast";
import { brand, gradients } from "../theme";

export default function AddEmployee() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    employeeNo: "", name: "", fatherName: "", cnic: "", mobile: "", familyMobile: "", address: "",
    appointment: "", department: "", joiningDate: "", employeeType: "Permanent", maritalStatus: "", status: "Active",
    grossSalary: "", bankName: "", accountTitle: "", iban: "", remarks: "", photo: "", cnicCopy: "", policeVerification: "", policeVerificationDate: "",
  });

  const handleSave = async () => {
    if (!formData.employeeNo || !formData.name) {
      showToast("Employee No and Name are required", "error");
      return;
    }
    setSaving(true);
    try {
      await addEmployee(formData);
      showToast("Employee added successfully", "success");
      setTimeout(() => navigate("/employees/list"), 800);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Error saving employee", "error");
    } finally { setSaving(false); }
  };

  return (
    <MainLayout>
      <Box sx={{ px: { xs: 1, sm: 1.5, md: 1.75 }, pt: 1, pb: 4, width: "100%", maxWidth: "none", mx: 0, minWidth: 0, overflowX: "hidden", background: "transparent", borderRadius: 1.5, minHeight: "100%" }}>
        <Box sx={{ mb: 1.2 }}>
          <Box sx={{ display: "inline-flex", alignItems: "center", border: "1px solid #c9a227", borderRadius: 999, px: 1.25, py: .3, mb: .35, background: "transparent" }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.25, color: "#a27b00", lineHeight: 1.1 }}>NEW RECORD</Typography>
          </Box>
          <Typography sx={{ fontSize: { xs: 25, md: 29 }, fontWeight: 400, lineHeight: 1.1, color: "#14213d" }}>Add New Employee</Typography>
          <Typography sx={{ mt: .25, fontSize: 14, color: "#26384e" }}>Enter employee information below.</Typography>
        </Box>
        <EmployeeForm formData={formData} setFormData={setFormData} />
        <Box sx={{ mt: 1.2, display: "flex", justifyContent: "flex-end", gap: 1.2, flexWrap: "wrap" }}>
          <Button variant="outlined" color="inherit" startIcon={<ArrowBackIcon />} onClick={() => navigate("/employees/list")}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveIcon />} disabled={saving} onClick={handleSave} sx={{ background: gradients.brand }}>{saving ? "Saving..." : "Save Employee"}</Button>
        </Box>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
