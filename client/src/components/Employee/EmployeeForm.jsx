import { useState } from "react";
import {
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

const fieldSx = {
  minWidth: 0,
  width: "100%",
  "& .MuiOutlinedInput-root": {
    minHeight: 52,
    borderRadius: 2.25,
    background: "rgba(255,255,255,0.78)",
    transition: "all .18s ease",
    "&:hover": { background: "rgba(255,255,255,0.94)" },
    "&.Mui-focused": {
      background: "#fff",
      boxShadow: "0 0 0 3px rgba(10,143,220,0.12)",
    },
  },
  "& .MuiInputLabel-root": { fontWeight: 600, color: brand.slate },
};

function SectionHeader({ icon, title, subtitle }) {
  return (
    <Box sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 2,
      mb: 2.5,
      pb: 1.5,
      borderBottom: "1px solid rgba(15,76,129,0.12)",
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
        <Box sx={{
          width: 44,
          height: 44,
          borderRadius: 2.5,
          background: gradients.brand,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 8px 18px rgba(8,33,63,0.18)",
        }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" fontWeight={800} sx={{ color: brand.ink, lineHeight: 1.15 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: brand.slate, display: "block", mt: 0.45 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      <Box sx={{
        width: 78,
        height: 4,
        borderRadius: 10,
        background: gradients.goldLine,
        flexShrink: 0,
      }} />
    </Box>
  );
}

function FormCard({ children }) {
  return (
    <Card sx={{
      mb: 2.25,
      borderRadius: 3,
      boxShadow: shadowCard,
      border: "1px solid rgba(15,76,129,0.13)",
      overflow: "hidden",
      background: "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(223,235,250,0.92) 100%)",
    }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ children, span = 1 }) {
  return (
    <Box sx={{
      minWidth: 0,
      gridColumn: {
        xs: "1 / -1",
        md: span === 2 ? "span 2" : "span 1",
      },
    }}>
      {children}
    </Box>
  );
}

function SquareUploadBox({ label, previewUrl, isImage, fileName, onChange }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" fontWeight={800} sx={{ color: brand.slate, pl: 0.3 }}>
        {label}
      </Typography>
      <Box
        component="label"
        sx={{
          mt: 0.7,
          width: "100%",
          aspectRatio: "1 / 1",
          maxWidth: 170,
          borderRadius: 3,
          border: `2px dashed ${previewUrl ? brand.gold : "#AFC3DA"}`,
          background: previewUrl ? "#dfebfa" : "rgba(255,255,255,0.62)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          overflow: "hidden",
          position: "relative",
          transition: "all .18s ease",
          "&:hover": { borderColor: brand.gold, transform: "translateY(-2px)", boxShadow: "0 10px 22px rgba(8,33,63,0.12)" },
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
            <UploadFileIcon sx={{ fontSize: 32, color: brand.blueDeep }} />
            <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: brand.slate, fontWeight: 700 }}>
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
  const [viewField, setViewField] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const viewAdornment = (label, value) => ({
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          size="small"
          edge="end"
          onClick={() => setViewField({ label, value })}
          sx={{ color: brand.blueDeep }}
        >
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </InputAdornment>
    ),
  });

  const photoPreview = formData.photo instanceof File
    ? URL.createObjectURL(formData.photo)
    : formData.photo ? (formData.photo.startsWith("http") ? formData.photo : `${formData.photo}`) : null;

  const cnicIsImage = formData.cnicCopy instanceof File
    ? formData.cnicCopy.type.startsWith("image/")
    : (typeof formData.cnicCopy === "string" && /\.(jpg|jpeg|png|gif|webp)$/i.test(formData.cnicCopy));
  const cnicPreview = formData.cnicCopy instanceof File
    ? URL.createObjectURL(formData.cnicCopy)
    : formData.cnicCopy ? (formData.cnicCopy.startsWith("http") ? formData.cnicCopy : `${formData.cnicCopy}`) : null;
  const cnicFileName = formData.cnicCopy instanceof File ? formData.cnicCopy.name : (formData.cnicCopy ? "CNIC copy uploaded" : null);

  const policeIsImage = formData.policeVerification instanceof File
    ? formData.policeVerification.type.startsWith("image/")
    : (typeof formData.policeVerification === "string" && /\.(jpg|jpeg|png|gif|webp)$/i.test(formData.policeVerification));
  const policePreview = formData.policeVerification instanceof File
    ? URL.createObjectURL(formData.policeVerification)
    : formData.policeVerification ? (formData.policeVerification.startsWith("http") ? formData.policeVerification : `${formData.policeVerification}`) : null;
  const policeFileName = formData.policeVerification instanceof File ? formData.policeVerification.name : (formData.policeVerification ? "Police verification uploaded" : null);

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
      <FormCard>
        <SectionHeader icon={<PersonIcon />} title="Personal Information" subtitle="Basic employee identity and contact details" />
        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2,minmax(0,1fr))" },
          gap: { xs: 1.5, md: 2 },
          minWidth: 0,
        }}>
          <Field><TextField sx={fieldSx} label="Employee No" name="employeeNo" value={formData.employeeNo || ""} onChange={handleChange} /></Field>
          <Field><TextField sx={fieldSx} label="Employee Name" name="name" value={formData.name || ""} onChange={handleChange} /></Field>
          <Field><TextField sx={fieldSx} label="Father Name" name="fatherName" value={formData.fatherName || ""} onChange={handleChange} /></Field>
          <Field><TextField sx={fieldSx} label="CNIC" name="cnic" value={formData.cnic || ""} onChange={handleChange} /></Field>
          <Field><TextField sx={fieldSx} label="Mobile No" name="mobile" value={formData.mobile || ""} onChange={handleChange} /></Field>
          <Field><TextField sx={fieldSx} label="Family Mobile No" name="familyMobile" value={formData.familyMobile || ""} onChange={handleChange} /></Field>
          <Field span={2}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={3}
              sx={{ ...fieldSx, "& .MuiOutlinedInput-root": { ...fieldSx["& .MuiOutlinedInput-root"], minHeight: 72, alignItems: "flex-start" } }}
              label="Address"
              name="address"
              value={formData.address || ""}
              onChange={handleChange}
              slotProps={{ input: viewAdornment("Address", formData.address) }}
              helperText="Wide address field — no text cut-off"
            />
          </Field>
        </Box>
      </FormCard>

      <FormCard>
        <SectionHeader icon={<WorkIcon />} title="Employment Information" subtitle="Posting, joining and employment status" />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2,minmax(0,1fr))" }, gap: { xs: 1.5, md: 2 }, minWidth: 0 }}>
          <Field><TextField sx={fieldSx} label="Appointment" name="appointment" value={formData.appointment || ""} onChange={handleChange} /></Field>
          <Field><TextField sx={fieldSx} label="Department" name="department" value={formData.department || ""} onChange={handleChange} /></Field>
          <Field><DateFieldDMY label="Joining Date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} /></Field>
          <Field><TextField sx={fieldSx} fullWidth select label="Marital Status" name="maritalStatus" value={formData.maritalStatus || ""} onChange={handleChange}><MenuItem value="Single">Single</MenuItem><MenuItem value="Married">Married</MenuItem><MenuItem value="Divorced">Divorced</MenuItem><MenuItem value="Widowed">Widowed</MenuItem></TextField></Field>
          <Field><TextField sx={fieldSx} fullWidth select label="Employee Type" name="employeeType" value={formData.employeeType || ""} onChange={handleChange}><MenuItem value="Permanent">Permanent</MenuItem><MenuItem value="Contract">Contract</MenuItem><MenuItem value="Daily Wages">Daily Wages</MenuItem></TextField></Field>
          <Field><TextField sx={fieldSx} fullWidth select label="Status" name="status" value={formData.status || "Active"} onChange={handleChange}><MenuItem value="Active">Active</MenuItem><MenuItem value="Inactive">Inactive</MenuItem></TextField></Field>
        </Box>
      </FormCard>

      <FormCard>
        <SectionHeader icon={<AccountBalanceWalletIcon />} title="Salary & Bank Information" subtitle="Payment account and salary details" />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2,minmax(0,1fr))" }, gap: { xs: 1.5, md: 2 }, minWidth: 0 }}>
          <Field><TextField sx={fieldSx} fullWidth label="Gross Salary" name="grossSalary" value={formData.grossSalary || ""} onChange={handleChange} /></Field>
          <Field><TextField sx={fieldSx} fullWidth label="Bank Name" name="bankName" value={formData.bankName || ""} onChange={handleChange} /></Field>
          <Field span={2}><TextField sx={{ ...fieldSx, width: "100%" }} fullWidth label="Account Title" name="accountTitle" value={formData.accountTitle || ""} onChange={handleChange} /></Field>
          <Field span={2}>
            <TextField
              fullWidth
              label="IBAN"
              name="iban"
              value={formData.iban || ""}
              onChange={handleChange}
              sx={{ ...fieldSx, width: "100%" }}
              slotProps={{ input: viewAdornment("IBAN", formData.iban) }}
              helperText="Extra-wide IBAN field for complete account number visibility"
            />
          </Field>
        </Box>
      </FormCard>

      <FormCard>
        <SectionHeader icon={<DescriptionIcon />} title="Documents & Remarks" subtitle="Upload supporting documents and notes" />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3,minmax(0,1fr))" }, gap: 2, minWidth: 0 }}>
          <SquareUploadBox label="Employee Photo" previewUrl={photoPreview} isImage onChange={(e) => setFormData({ ...formData, photo: e.target.files[0] })} />
          <SquareUploadBox label="CNIC Copy" previewUrl={cnicPreview} isImage={cnicIsImage} fileName={cnicFileName} onChange={(e) => setFormData({ ...formData, cnicCopy: e.target.files[0] })} />
          <SquareUploadBox label="Police Verification" previewUrl={policePreview} isImage={policeIsImage} fileName={policeFileName} onChange={(e) => setFormData({ ...formData, policeVerification: e.target.files[0] })} />
          <Box sx={{ gridColumn: "1 / -1", minWidth: 0 }}>
            <TextField sx={fieldSx} fullWidth multiline minRows={3} maxRows={6} label="Remarks" name="remarks" value={formData.remarks || ""} onChange={handleChange} />
          </Box>
        </Box>
      </FormCard>

      <Dialog open={!!viewField} onClose={() => setViewField(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: brand.ink }}>{viewField?.label}</DialogTitle>
        <DialogContent>
          <Typography sx={{ wordBreak: "break-word", color: brand.slate, pb: 1 }}>{viewField?.value || "—"}</Typography>
          <Button variant="contained" onClick={() => setViewField(null)} sx={{ background: gradients.brand }}>Close</Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
