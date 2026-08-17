import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
} from "@mui/material";

import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import MainLayout from "../layouts/MainLayout";
import { addFinanceHead } from "../api/financeApi";
import { useToast } from "../utils/useToast";
import { brand, gradients } from "../theme";

export default function AddHead() {
  const navigate = useNavigate();
  const { showToast, ToastUI } = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    headName: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.headName.trim()) {
      showToast("Head Name is required", "error");
      return;
    }

    setSaving(true);
    try {
      await addFinanceHead(formData);
      showToast("Head added successfully", "success");
      setTimeout(() => navigate("/finance"), 800);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Error saving head", "error");
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
        }}>NEW HEAD
        </Box>

        <Typography variant="h4" fontWeight="bold" mb={1}>
          Add Finance Head
        </Typography>

        <Typography color="text.secondary" mb={3}>
          Add a head with its name only. Use the "Add Allocation" tab to add amounts into this head.
        </Typography>

        <Card elevation={4} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3.5 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Head Name"
                  name="headName"
                  value={formData.headName}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/finance")}
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
                {saving ? "Saving..." : "Save Head"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
