import { useState } from "react";
import {
  Grid,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PersonIcon from "@mui/icons-material/Person";
import WorkIcon from "@mui/icons-material/Work";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import DescriptionIcon from "@mui/icons-material/Description";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { brand, gradients, shadowCard } from "../../theme";
import DateFieldDMY from "../DateFieldDMY";

function SectionHeader({ icon, title }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
      <Box sx={{
        width: 40, height: 40, borderRadius: 2.5,
        background: gradients.brand, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Typography variant="h6" fontWeight={700} sx={{ color: brand.ink }}>
        {title}
      </Typography>
    </Box>
  );
}

function SquareUploadBox({ label, previewUrl, isImage, fileName, onChange }) {
  return (
    <Box>
      <Typography variant="caption" fontWeight={700} sx={{ color: brand.slate, pl: 0.3 }}>
        {label}
      </Typography>
      <Box
        component="label"
        sx={{
          mt: 0.7,
          width: "100%",
          aspectRatio: "1 / 1",
          maxWidth: 160,
          borderRadius: 3,
          border: `2px dashed ${previewUrl ? brand.gold : "#C9D3E3"}`,
          background: previewUrl ? "#dfebfa" : "#eaf3fc",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          overflow: "hidden",
          position: "relative",
          transition: "0.2s",
          "&:hover": { borderColor: brand.gold, background: "#FFFDF6" },
        }}
      >
        {previewUrl && isImage && (
          <img src={previewUrl} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        {previewUrl && !isImage && (
          <Box sx={{ textAlign: "center", p: 1 }}>
            <InsertDriveFileIcon sx={{ fontSize: 40, color: brand.goldDark }} />
            <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: brand.slate, wordBreak: "break-all", px: 1 }}>
              {fileName}
            </Typography>
          </Box>
        )}
        {!previewUrl && (
          <Box sx={{ textAlign: "center" }}>
            <UploadFileIcon sx={{ fontSize: 32, color: "#9AA5B5" }} />
            <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "#9AA5B5" }}>
              Upload
            </Typography>
          </Box>
        )}
        <input hidden type="file" accept="image/*,.pdf" onChange={onChange} />
      </Box>
    </Box>
  );
}

export default function EmployeeForm({ formData, setFormData }) {
  const [viewField, setViewField] = useState(null); // { label, value }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const viewAdornment = (label, value) => ({
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          size="small"
          edge="end"
          onClick={() => setViewField({ label, value })}
          sx={{ color: brand.slate }}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </InputAdornment>
    ),
  });

  const photoPreview = formData.photo instanceof File
    ? URL.createObjectURL(formData.photo)
    : formData.photo
      ? (formData.photo.startsWith("http") ? formData.photo : `${formData.photo}`)
      : null;

  const cnicIsImage = formData.cnicCopy instanceof File
    ? formData.cnicCopy.type.startsWith("image/")
    : (typeof formData.cnicCopy === "string" && /\.(jpg|jpeg|png|gif|webp)$/i.test(formData.cnicCopy));

  const cnicPreview = formData.cnicCopy instanceof File
    ? URL.createObjectURL(formData.cnicCopy)
    : formData.cnicCopy
      ? (formData.cnicCopy.startsWith("http") ? formData.cnicCopy : `${formData.cnicCopy}`)
      : null;

  const cnicFileName = formData.cnicCopy instanceof File
    ? formData.cnicCopy.name
    : (formData.cnicCopy ? "CNIC copy uploaded" : null);

  const policeIsImage = formData.policeVerification instanceof File
    ? formData.policeVerification.type.startsWith("image/")
    : (typeof formData.policeVerification === "string" && /\.(jpg|jpeg|png|gif|webp)$/i.test(formData.policeVerification));

  const policePreview = formData.policeVerification instanceof File
    ? URL.createObjectURL(formData.policeVerification)
    : formData.policeVerification
      ? (formData.policeVerification.startsWith("http") ? formData.policeVerification : `${formData.policeVerification}`)
      : null;

  const policeFileName = formData.policeVerification instanceof File
    ? formData.policeVerification.name
    : (formData.policeVerification ? "Police verification uploaded" : null);

  return (
    <>
      {/* Personal Information */}
      <Card sx={{ mb: 3, borderRadius: 4, boxShadow: shadowCard }}>
        <CardContent sx={{ p: 3.5 }}>
          <SectionHeader icon={<PersonIcon />} title="Personal Information" />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Employee No" name="employeeNo" value={formData.employeeNo || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Employee Name" name="name" value={formData.name || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Father Name" name="fatherName" value={formData.fatherName || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="CNIC" name="cnic" value={formData.cnic || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Mobile No" name="mobile" value={formData.mobile || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Family Mobile No" name="familyMobile" value={formData.familyMobile || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ width: "100%", overflowX: "auto" }}>
                <TextField
                  label="Address"
                  name="address"
                  value={formData.address || ""}
                  onChange={handleChange}
                  slotProps={{ input: viewAdornment("Address", formData.address) }}
                  sx={{ width: { xs: "100%", md: "200%" } }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Employment Information */}
      <Card sx={{ mb: 3, borderRadius: 4, boxShadow: shadowCard }}>
        <CardContent sx={{ p: 3.5 }}>
          <SectionHeader icon={<WorkIcon />} title="Employment Information" />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Appointment" name="appointment" value={formData.appointment || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Department" name="department" value={formData.department || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <DateFieldDMY label="Joining Date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth select sx={{ minWidth: 200 }} label="Marital Status" name="maritalStatus" value={formData.maritalStatus || ""} onChange={handleChange}>
                <MenuItem value="Single">Single</MenuItem>
                <MenuItem value="Married">Married</MenuItem>
                <MenuItem value="Divorced">Divorced</MenuItem>
                <MenuItem value="Widowed">Widowed</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth select label="Employee Type" name="employeeType" value={formData.employeeType || ""} onChange={handleChange}>
                <MenuItem value="Permanent">Permanent</MenuItem>
                <MenuItem value="Contract">Contract</MenuItem>
                <MenuItem value="Daily Wages">Daily Wages</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth select label="Status" name="status" value={formData.status || "Active"} onChange={handleChange}>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Salary & Bank Information */}
      <Card sx={{ mb: 3, borderRadius: 4, boxShadow: shadowCard }}>
        <CardContent sx={{ p: 3.5 }}>
          <SectionHeader icon={<AccountBalanceWalletIcon />} title="Salary & Bank Information" />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Gross Salary" name="grossSalary" value={formData.grossSalary || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Bank Name" name="bankName" value={formData.bankName || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Account Title" name="accountTitle" value={formData.accountTitle || ""} onChange={handleChange} />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ width: "100%", overflowX: "auto" }}>
                <TextField
                  label="IBAN"
                  name="iban"
                  value={formData.iban || ""}
                  onChange={handleChange}
                  slotProps={{ input: viewAdornment("IBAN", formData.iban) }}
                  sx={{ width: { xs: "100%", md: "150%" } }}
                />
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Documents & Remarks */}
      <Card sx={{ mb: 3, borderRadius: 4, boxShadow: shadowCard }}>
        <CardContent sx={{ p: 3.5 }}>
          <SectionHeader icon={<DescriptionIcon />} title="Documents & Remarks" />

          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <SquareUploadBox
                label="Employee Photo"
                previewUrl={photoPreview}
                isImage
                onChange={(e) => setFormData({ ...formData, photo: e.target.files[0] })}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <SquareUploadBox
                label="CNIC Copy"
                previewUrl={cnicPreview}
                isImage={cnicIsImage}
                fileName={cnicFileName}
                onChange={(e) => setFormData({ ...formData, cnicCopy: e.target.files[0] })}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <SquareUploadBox
                label="Police Verification"
                previewUrl={policePreview}
                isImage={policeIsImage}
                fileName={policeFileName}
                onChange={(e) => setFormData({ ...formData, policeVerification: e.target.files[0] })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth multiline rows={4} label="Remarks" name="remarks" value={formData.remarks || ""} onChange={handleChange} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Dialog open={!!viewField} onClose={() => setViewField(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: brand.ink }}>{viewField?.label}</DialogTitle>
        <DialogContent>
          <Typography sx={{ wordBreak: "break-word", color: brand.slate, pb: 1 }}>
            {viewField?.value || "—"}
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
}
