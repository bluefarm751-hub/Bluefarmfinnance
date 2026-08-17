import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
} from "@mui/material";

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
    employeeNo: "",
    name: "",
    fatherName: "",
    cnic: "",
    mobile: "",
    familyMobile: "",
    address: "",
    appointment: "",
    department: "",
    joiningDate: "",
    employeeType: "Permanent",
    maritalStatus: "",
    status: "Active",
    grossSalary: "",
    bankName: "",
    accountTitle: "",
    iban: "",
    remarks: "",
    photo: "",
    cnicCopy: "",
    policeVerification: "",
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <Box sx={{ p: 3 }}>

        <Box sx={{
          display: "inline-flex", alignItems: "center", gap: 0.6,
          px: 1.6, py: 0.4, borderRadius: 10,
          background: `${brand.gold}1f`, border: `1px solid ${brand.gold}`,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldDark, mb: 1.2,
        }}>NEW RECORD
        </Box>

        <Typography
          variant="h4"
          fontWeight="bold"
          mb={1}
        >
          Add New Employee
        </Typography>

        <Typography
          color="text.secondary"
          mb={3}
        >
          Enter employee information below.
        </Typography>

        <Card
          elevation={4}
          sx={{
            borderRadius: 3,
          }}
        >
          <CardContent>

            <EmployeeForm
              formData={formData}
              setFormData={setFormData}
            />

            <Box
              sx={{
                mt: 4,
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
              }}
            >
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/employees/list")}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={saving}
                onClick={handleSave}
                sx={{ background: gradients.brand }}
              >
                {saving ? "Saving..." : "Save Employee"}
              </Button>
            </Box>

          </CardContent>
        </Card>

      </Box>
      {ToastUI}
    </MainLayout>
  );
}