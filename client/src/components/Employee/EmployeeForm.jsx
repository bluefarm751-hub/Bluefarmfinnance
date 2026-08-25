import { useState } from "react";
import {
  TextField, MenuItem, Card, CardContent, Typography, Button, Box,
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

const fieldSx = {
  minWidth: 0,
  width: "100%",
  "& .MuiOutlinedInput-root": {
    minHeight: 48,
    borderRadius: 1.8,
    backgroundColor: "#fff",
    transition: "border-color .18s ease, box-shadow .18s ease",
    "&:hover": { "& .MuiOutlinedInput-notchedOutline": { borderColor: "#8aa9c5" } },
    "&.Mui-focused": {
      boxShadow: "0 0 0 3px rgba(10,143,220,0.10)",
      "& .MuiOutlinedInput-notchedOutline": { borderColor: brand.blueBright, borderWidth: 1.5 },
    },
  },
  "& .MuiInputLabel-root": { fontWeight: 600, color: "#60758a", "&.Mui-focused": { color: brand.blueDeep } },
  "& .MuiInputLabel-root.MuiInputLabel-shrink": { backgroundColor: "#fff", px: 0.6 },
};

function SectionHeader({ icon, title, subtitle, number }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, pb: 1.5, mb: 2, borderBottom: "1px solid rgba(15,76,129,0.12)" }}>
      <Box sx={{ width: 38, height: 38, borderRadius: 1.8, background: gradients.brand, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 7px 16px rgba(8,33,63,0.16)" }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ color: brand.ink, fontWeight: 800, fontSize: 18, lineHeight: 1.15 }}>{title}</Typography>
        <Typography sx={{ color: brand.slate, fontSize: 12.5, mt: 0.3 }}>{subtitle}</Typography>
      </Box>
      <Box sx={{ minWidth: 30, height: 30, px: 1, borderRadius: 99, border: `1px solid ${brand.gold}`, color: brand.goldDark, bgcolor: "#fffaf0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
        {number}
      </Box>
    </Box>
  );
}

function FormCard({ children }) {
  return (
    <Card elevation={0} sx={{ mb: 2, borderRadius: 2.5, border: "1px solid rgba(15,76,129,0.14)", boxShadow: "0 10px 28px rgba(8,33,63,0.10)", background: "linear-gradient(180deg, #fff 0%, #f4f8fd 100%)", overflow: "hidden" }}>
      <CardContent sx={{ p: { xs: 1.8, sm: 2.2, md: 2.5 }, "&:last-child": { pb: { xs: 1.8, sm: 2.2, md: 2.5 } } }}>{children}</CardContent>
    </Card>
  );
}

function Field({ children, span = 1 }) {
  return <Box sx={{ minWidth: 0, gridColumn: { xs: "1 / -1", md: span === 2 ? "1 / -1" : "auto" } }}>{children}</Box>;
}

function SquareUploadBox({ label, previewUrl, isImage, fileName, onChange }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ color: brand.ink, fontWeight: 700, fontSize: 12.5, mb: 0.7 }}>{label}</Typography>
      <Box component="label" sx={{ width: "100%", height: 112, borderRadius: 2, border: `1px dashed ${previewUrl ? brand.gold : "#9fb6ca"}`, background: previewUrl ? "#edf5fd" : "#f8fbfe", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", position: "relative", transition: "all .18s ease", "&:hover": { borderColor: brand.gold, background: "#fffdf5" } }}>
        {previewUrl && isImage && <img src={previewUrl} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        {previewUrl && !isImage && <Box sx={{ textAlign: "center", p: 1 }}><InsertDriveFileIcon sx={{ fontSize: 30, color: brand.goldDark }} /><Typography sx={{ display: "block", mt: 0.4, color: brand.slate, fontSize: 11, wordBreak: "break-all", px: 1 }}>{fileName}</Typography></Box>}
        {!previewUrl && <Box sx={{ textAlign: "center" }}><UploadFileIcon sx={{ fontSize: 28, color: brand.blueDeep }} /><Typography sx={{ display: "block", mt: 0.4, color: brand.slate, fontWeight: 700, fontSize: 11.5 }}>Click to upload</Typography></Box>}
        <input hidden type="file" accept="image/*,.pdf" onChange={onChange} />
      </Box>
    </Box>
  );
}

export default function EmployeeForm({ formData, setFormData }) {
  const [viewField, setViewField] = useState(null);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const viewAdornment = (label, value) => ({ endAdornment: <InputAdornment position="end"><IconButton size="small" edge="end" onClick={() => setViewField({ label, value })} sx={{ color: brand.blueDeep }}><VisibilityIcon fontSize="small" /></IconButton></InputAdornment> });

  const photoPreview = formData.photo instanceof File ? URL.createObjectURL(formData.photo) : formData.photo ? (formData.photo.startsWith("http") ? formData.photo : `${formData.photo}`) : null;
  const cnicIsImage = formData.cnicCopy instanceof File ? formData.cnicCopy.type.startsWith("image/") : (typeof formData.cnicCopy === "string" && /\.(jpg|jpeg|png|gif|webp)$/i.test(formData.cnicCopy));
  const cnicPreview = formData.cnicCopy instanceof File ? URL.createObjectURL(formData.cnicCopy) : formData.cnicCopy ? (formData.cnicCopy.startsWith("http") ? formData.cnicCopy : `${formData.cnicCopy}`) : null;
  const cnicFileName = formData.cnicCopy instanceof File ? formData.cnicCopy.name : (formData.cnicCopy ? "CNIC copy uploaded" : null);
  const policeIsImage = formData.policeVerification instanceof File ? formData.policeVerification.type.startsWith("image/") : (typeof formData.policeVerification === "string" && /\.(jpg|jpeg|png|gif|webp)$/i.test(formData.policeVerification));
  const policePreview = formData.policeVerification instanceof File ? URL.createObjectURL(formData.policeVerification) : formData.policeVerification ? (formData.policeVerification.startsWith("http") ? formData.policeVerification : `${formData.policeVerification}`) : null;
  const policeFileName = formData.policeVerification instanceof File ? formData.policeVerification.name : (formData.policeVerification ? "Police verification uploaded" : null);

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <FormCard>
        <SectionHeader icon={<PersonIcon fontSize="small" />} number="01" title="Personal Information" subtitle="Employee identity and contact details" />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: { xs: 1.4, md: 1.6 }, minWidth: 0 }}>
          <Field><TextField size="small" sx={fieldSx} label="Employee No" name="employeeNo" value={formData.employeeNo || ""} onChange={handleChange} /></Field>
          <Field><TextField size="small" sx={fieldSx} label="Employee Name" name="name" value={formData.name || ""} onChange={handleChange} /></Field>
          <Field><TextField size="small" sx={fieldSx} label="Father Name" name="fatherName" value={formData.fatherName || ""} onChange={handleChange} /></Field>
          <Field><TextField size="small" sx={fieldSx} label="CNIC" name="cnic" value={formData.cnic || ""} onChange={handleChange} /></Field>
          <Field><TextField size="small" sx={fieldSx} label="Mobile No" name="mobile" value={formData.mobile || ""} onChange={handleChange} /></Field>
          <Field><TextField size="small" sx={fieldSx} label="Family Mobile No" name="familyMobile" value={formData.familyMobile || ""} onChange={handleChange} /></Field>
          <Field span={2}>
            <TextField fullWidth size="small" multiline minRows={3} maxRows={4} sx={{ ...fieldSx, "& .MuiOutlinedInput-root": { ...fieldSx["& .MuiOutlinedInput-root"], alignItems: "flex-start", minHeight: 96, pt: 1.2 } }} label="Address" name="address" value={formData.address || ""} onChange={handleChange} slotProps={{ input: viewAdornment("Address", formData.address) }} />
          </Field>
        </Box>
      </FormCard>

      <FormCard>
        <SectionHeader icon={<WorkIcon fontSize="small" />} number="02" title="Employment Information" subtitle="Posting, joining and employment status" />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: { xs: 1.4, md: 1.6 }, minWidth: 0 }}>
          <Field><TextField size="small" sx={fieldSx} label="Appointment" name="appointment" value={formData.appointment || ""} onChange={handleChange} /></Field>
          <Field><TextField size="small" sx={fieldSx} label="Department" name="department" value={formData.department || ""} onChange={handleChange} /></Field>
          <Field><DateFieldDMY label="Joining Date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} /></Field>
          <Field><TextField size="small" sx={fieldSx} fullWidth select label="Marital Status" name="maritalStatus" value={formData.maritalStatus || ""} onChange={handleChange}><MenuItem value="Single">Single</MenuItem><MenuItem value="Married">Married</MenuItem><MenuItem value="Divorced">Divorced</MenuItem><MenuItem value="Widowed">Widowed</MenuItem></TextField></Field>
          <Field><TextField size="small" sx={fieldSx} fullWidth select label="Employee Type" name="employeeType" value={formData.employeeType || ""} onChange={handleChange}><MenuItem value="Permanent">Permanent</MenuItem><MenuItem value="Contract">Contract</MenuItem><MenuItem value="Daily Wages">Daily Wages</MenuItem></TextField></Field>
          <Field><TextField size="small" sx={fieldSx} fullWidth select label="Status" name="status" value={formData.status || "Active"} onChange={handleChange}><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></TextField></Field>
        </Box>
      </FormCard>

      <FormCard>
        <SectionHeader icon={<AccountBalanceWalletIcon fontSize="small" />} number="03" title="Salary & Bank Information" subtitle="Salary and payment account details" />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: { xs: 1.4, md: 1.6 }, minWidth: 0 }}>
          <Field><TextField size="small" sx={fieldSx} fullWidth label="Gross Salary" name="grossSalary" value={formData.grossSalary || ""} onChange={handleChange} /></Field>
          <Field><TextField size="small" sx={fieldSx} fullWidth label="Bank Name" name="bankName" value={formData.bankName || ""} onChange={handleChange} /></Field>
          <Field span={2}><TextField size="small" sx={fieldSx} fullWidth label="Account Title" name="accountTitle" value={formData.accountTitle || ""} onChange={handleChange} /></Field>
          <Field span={2}>
            <TextField fullWidth size="small" label="IBAN" name="iban" value={formData.iban || ""} onChange={handleChange} sx={{ ...fieldSx, width: { xs: "100%", md: "calc(50% + 50px)" }, minWidth: 0 }} slotProps={{ input: viewAdornment("IBAN", formData.iban) }} />
          </Field>
        </Box>
      </FormCard>

      <FormCard>
        <SectionHeader icon={<DescriptionIcon fontSize="small" />} number="04" title="Documents & Remarks" subtitle="Supporting documents and additional notes" />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, gap: 1.8, minWidth: 0 }}>
          <SquareUploadBox label="Employee Photo" previewUrl={photoPreview} isImage onChange={(e) => setFormData({ ...formData, photo: e.target.files[0] })} />
          <SquareUploadBox label="CNIC Copy" previewUrl={cnicPreview} isImage={cnicIsImage} fileName={cnicFileName} onChange={(e) => setFormData({ ...formData, cnicCopy: e.target.files[0] })} />
          <SquareUploadBox label="Police Verification" previewUrl={policePreview} isImage={policeIsImage} fileName={policeFileName} onChange={(e) => setFormData({ ...formData, policeVerification: e.target.files[0] })} />
          <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}><TextField size="small" sx={fieldSx} fullWidth multiline minRows={3} maxRows={5} label="Remarks" name="remarks" value={formData.remarks || ""} onChange={handleChange} /></Box>
        </Box>
      </FormCard>

      <Dialog open={!!viewField} onClose={() => setViewField(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: brand.ink }}>{viewField?.label}</DialogTitle>
        <DialogContent>
          <Typography sx={{ wordBreak: "break-word", color: brand.slate, pb: 1.5 }}>{viewField?.value || "—"}</Typography>
          <Button variant="contained" onClick={() => setViewField(null)} sx={{ background: gradients.brand }}>Close</Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
