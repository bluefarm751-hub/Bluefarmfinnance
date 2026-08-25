import { useState } from "react";
import {
  TextField, MenuItem, Typography, Button, Box,
  IconButton, InputAdornment, Dialog, DialogTitle, DialogContent,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PersonIcon from "@mui/icons-material/Person";
import WorkIcon from "@mui/icons-material/Work";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import DescriptionIcon from "@mui/icons-material/Description";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { brand, gradients } from "../../theme";
import DateFieldDMY from "../DateFieldDMY";

const inputSx = {
  width: "100%",
  minWidth: 0,
  "& .MuiOutlinedInput-root": {
    minHeight: 38,
    borderRadius: 1.25,
    background: "#fff",
    "& fieldset": { borderColor: "#b7c8d8" },
    "&:hover fieldset": { borderColor: "#7fa5c4" },
    "&.Mui-focused": {
      boxShadow: "0 0 0 3px rgba(10,143,220,0.08)",
      "& fieldset": { borderColor: `${brand.blueBright} !important`, borderWidth: "1px !important" },
    },
  },
  "& .MuiInputBase-input": { fontSize: 14, py: .72, color: "#111827" },
  "& .MuiSelect-select": { fontSize: 14, py: .72, color: "#111827" },
};

function Section({ icon, title, children }) {
  return (
    <Box sx={{
      minWidth: 0,
      border: "1px solid #c8d7e4",
      borderRadius: 2,
      overflow: "hidden",
      background: "#f8fbff",
      boxShadow: "0 5px 14px rgba(8,33,63,.07)",
    }}>
      <Box sx={{
        px: 1.4,
        py: .78,
        display: "flex",
        alignItems: "center",
        gap: 1,
        background: "linear-gradient(180deg,#0f4c81 0%,#123f68 100%)",
        color: "#fff",
      }}>
        <Box sx={{
          width: 28,
          height: 28,
          borderRadius: 1,
          background: "rgba(255,255,255,.13)",
          display: "grid",
          placeItems: "center",
        }}>{icon}</Box>
        <Typography sx={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{title}</Typography>
      </Box>
      <Box sx={{ p: { xs: 1.05, md: 1.15 } }}>
        {children}
      </Box>
    </Box>
  );
}

function Field({ label, children, span = 1 }) {
  return (
    <Box sx={{ minWidth: 0, gridColumn: { xs: "1 / -1", md: span === 2 ? "1 / -1" : "auto" } }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#111827", mb: .38, lineHeight: 1.15 }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function UploadBox({ label, previewUrl, isImage, fileName, onChange }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#111827", mb: .38, lineHeight: 1.15 }}>{label}</Typography>
      <Box component="label" sx={{
        height: 84,
        border: `1px dashed ${previewUrl ? brand.gold : "#9bb2c7"}`,
        borderRadius: 1.35,
        background: previewUrl ? "#eef7ff" : "#fff",
        display: "grid", placeItems: "center", cursor: "pointer", overflow: "hidden",
        position: "relative",
        transition: ".18s ease",
        "&:hover": { borderColor: brand.blueBright, background: "#f5fbff" },
      }}>
        {previewUrl && isImage && <img src={previewUrl} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        {previewUrl && !isImage && <Box sx={{ textAlign: "center", p: 1 }}><InsertDriveFileIcon sx={{ fontSize: 28, color: brand.goldDark }} /><Typography sx={{ fontSize: 10.5, color: "#111827", wordBreak: "break-all" }}>{fileName}</Typography></Box>}
        {!previewUrl && <Box sx={{ textAlign: "center" }}><UploadFileIcon sx={{ fontSize: 24, color: brand.blueDeep }} /><Typography sx={{ fontSize: 10.5, fontWeight: 600, color: "#111827" }}>Upload file</Typography></Box>}
        <input hidden type="file" accept="image/*,.pdf" onChange={onChange} />
      </Box>
    </Box>
  );
}

export default function EmployeeForm({ formData, setFormData }) {
  const [viewField, setViewField] = useState(null);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const viewAdornment = (label, value) => ({ endAdornment: <InputAdornment position="end"><IconButton size="small" edge="end" onClick={() => setViewField({ label, value })} sx={{ color: brand.blueDeep }}><VisibilityIcon fontSize="small" /></IconButton></InputAdornment> });

  const photoPreview = formData.photo instanceof File ? URL.createObjectURL(formData.photo) : formData.photo ? `${formData.photo}` : null;
  const cnicIsImage = formData.cnicCopy instanceof File ? formData.cnicCopy.type.startsWith("image/") : (typeof formData.cnicCopy === "string" && /\.(jpg|jpeg|png|gif|webp)$/i.test(formData.cnicCopy));
  const cnicPreview = formData.cnicCopy instanceof File ? URL.createObjectURL(formData.cnicCopy) : formData.cnicCopy ? `${formData.cnicCopy}` : null;
  const cnicFileName = formData.cnicCopy instanceof File ? formData.cnicCopy.name : (formData.cnicCopy ? "CNIC copy uploaded" : null);
  const policeIsImage = formData.policeVerification instanceof File ? formData.policeVerification.type.startsWith("image/") : (typeof formData.policeVerification === "string" && /\.(jpg|jpeg|png|gif|webp)$/i.test(formData.policeVerification));
  const policePreview = formData.policeVerification instanceof File ? URL.createObjectURL(formData.policeVerification) : formData.policeVerification ? `${formData.policeVerification}` : null;
  const policeFileName = formData.policeVerification instanceof File ? formData.policeVerification.name : (formData.policeVerification ? "Police verification uploaded" : null);

  const twoCol = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, gap: .8 };

  return (
    <Box sx={{ width: "100%", minWidth: 0, display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2,minmax(0,1fr))" }, gap: 1.1 }}>
      <Section icon={<PersonIcon fontSize="small" />} title="Personal Information">
        <Box sx={twoCol}>
          <Field label="Employee No"><TextField hiddenLabel size="small" sx={inputSx} name="employeeNo" value={formData.employeeNo || ""} onChange={handleChange} /></Field>
          <Field label="Employee Name"><TextField hiddenLabel size="small" sx={inputSx} name="name" value={formData.name || ""} onChange={handleChange} /></Field>
          <Field label="Father Name"><TextField hiddenLabel size="small" sx={inputSx} name="fatherName" value={formData.fatherName || ""} onChange={handleChange} /></Field>
          <Field label="CNIC"><TextField hiddenLabel size="small" sx={inputSx} name="cnic" value={formData.cnic || ""} onChange={handleChange} /></Field>
          <Field label="Mobile No"><TextField hiddenLabel size="small" sx={inputSx} name="mobile" value={formData.mobile || ""} onChange={handleChange} /></Field>
          <Field label="Family Mobile No"><TextField hiddenLabel size="small" sx={inputSx} name="familyMobile" value={formData.familyMobile || ""} onChange={handleChange} /></Field>
          <Field label="Address" span={2}>
            <TextField hiddenLabel fullWidth multiline minRows={1} maxRows={2} sx={{ ...inputSx, "& .MuiOutlinedInput-root": { ...inputSx["& .MuiOutlinedInput-root"], minHeight: 54, alignItems: "flex-start" }, "& .MuiInputBase-input": { ...inputSx["& .MuiInputBase-input"], py: .65 } }} name="address" value={formData.address || ""} onChange={handleChange} slotProps={{ input: viewAdornment("Address", formData.address) }} />
          </Field>
        </Box>
      </Section>

      <Section icon={<WorkIcon fontSize="small" />} title="Employment Information">
        <Box sx={twoCol}>
          <Field label="Appointment"><TextField hiddenLabel size="small" sx={inputSx} name="appointment" value={formData.appointment || ""} onChange={handleChange} /></Field>
          <Field label="Department"><TextField hiddenLabel size="small" sx={inputSx} name="department" value={formData.department || ""} onChange={handleChange} /></Field>
          <Field label="Joining Date"><DateFieldDMY label="Joining Date" name="joiningDate" size="small" sx={inputSx} value={formData.joiningDate} onChange={handleChange} /></Field>
          <Field label="Marital Status"><TextField hiddenLabel size="small" sx={inputSx} fullWidth select name="maritalStatus" value={formData.maritalStatus || ""} onChange={handleChange}><MenuItem value="Single">Single</MenuItem><MenuItem value="Married">Married</MenuItem><MenuItem value="Divorced">Divorced</MenuItem><MenuItem value="Widowed">Widowed</MenuItem></TextField></Field>
          <Field label="Employee Type"><TextField hiddenLabel size="small" sx={inputSx} fullWidth select name="employeeType" value={formData.employeeType || ""} onChange={handleChange}><MenuItem value="Permanent">Permanent</MenuItem><MenuItem value="Contract">Contract</MenuItem><MenuItem value="Daily Wages">Daily Wages</MenuItem></TextField></Field>
          <Field label="Status"><TextField hiddenLabel size="small" sx={inputSx} fullWidth select name="status" value={formData.status || "Active"} onChange={handleChange}><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></TextField></Field>
        </Box>
      </Section>

      <Section icon={<AccountBalanceWalletIcon fontSize="small" />} title="Salary & Bank Information">
        <Box sx={twoCol}>
          <Field label="Gross Salary"><TextField hiddenLabel size="small" sx={inputSx} fullWidth name="grossSalary" value={formData.grossSalary || ""} onChange={handleChange} /></Field>
          <Field label="Bank Name"><TextField hiddenLabel size="small" sx={inputSx} fullWidth name="bankName" value={formData.bankName || ""} onChange={handleChange} /></Field>
          <Field label="Account Title"><TextField hiddenLabel size="small" sx={inputSx} fullWidth name="accountTitle" value={formData.accountTitle || ""} onChange={handleChange} /></Field>
          <Field label="IBAN" span={2}><TextField hiddenLabel fullWidth size="small" name="iban" value={formData.iban || ""} onChange={handleChange} sx={{ ...inputSx, width: { xs: "100%", sm: "min(760px, 86%)", lg: "min(820px, 86%)" } }} slotProps={{ input: viewAdornment("IBAN", formData.iban) }} /></Field>
        </Box>
      </Section>

      <Section icon={<DescriptionIcon fontSize="small" />} title="Documents & Remarks">
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, gap: 1.15 }}>
          <UploadBox label="Employee Photo" previewUrl={photoPreview} isImage onChange={(e) => setFormData({ ...formData, photo: e.target.files[0] })} />
          <UploadBox label="CNIC Copy" previewUrl={cnicPreview} isImage={cnicIsImage} fileName={cnicFileName} onChange={(e) => setFormData({ ...formData, cnicCopy: e.target.files[0] })} />
          <UploadBox label="Police Verification" previewUrl={policePreview} isImage={policeIsImage} fileName={policeFileName} onChange={(e) => setFormData({ ...formData, policeVerification: e.target.files[0] })} />
          <Field label="Remarks"><TextField hiddenLabel size="small" fullWidth multiline minRows={1} maxRows={4} name="remarks" value={formData.remarks || ""} onChange={handleChange} sx={{ ...inputSx, "& .MuiOutlinedInput-root": { ...inputSx["& .MuiOutlinedInput-root"], height: 84, alignItems: "flex-start" }, "& .MuiInputBase-input": { ...inputSx["& .MuiInputBase-input"], height: "100% !important", overflow: "auto !important" } }} /></Field>
        </Box>
      </Section>

      <Dialog open={!!viewField} onClose={() => setViewField(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: brand.ink }}>{viewField?.label}</DialogTitle>
        <DialogContent>
          <Typography sx={{ wordBreak: "break-word", color: "#111827", pb: 1.5 }}>{viewField?.value || "—"}</Typography>
          <Button variant="contained" onClick={() => setViewField(null)} sx={{ background: gradients.brand }}>Close</Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
