import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEmployee } from "../api/employeeApi";

import MainLayout from "../layouts/MainLayout";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from "@mui/material";

import {
  ArrowBack,
  Edit,
  Print,
  Phone,
  Badge as BadgeIcon,
  Home,
  Work,
  CalendarMonth,
  AccountBalanceWallet,
  AccountBalance,
  Fingerprint,
  ContactPhone,
  People,
  Wc,
} from "@mui/icons-material";
import { brand, gradients, shadowCard } from "../theme";
import { printDocument } from "../utils/print";
import { useToast } from "../utils/useToast";
import EmployeeDocuments from "../components/EmployeeDocuments";

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const { showToast, ToastUI } = useToast();

  useEffect(() => {
    loadEmployee();
  }, []);

  const loadEmployee = async () => {
    try {
      const res = await getEmployee(id);
      setEmployee(res.data || {});
    } catch (err) {
      console.log(err);
      showToast("Could not load employee profile", "error");
    } finally {
      setLoading(false);
    }
  };

  const isActive = (employee.status || "").toLowerCase() === "active";

  const handlePrint = () => {
    const photoUrl = employee.photo
      ? (employee.photo.startsWith("http") ? employee.photo : `${employee.photo}`)
      : "";

    const row = (label, value) => `
      <div class="info-item">
        <div>
          <div class="info-label">${label}</div>
          <div class="info-value">${value || "—"}</div>
        </div>
      </div>
    `;

    const bodyHtml = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
        <div>
          <div style="font-size:20px; font-weight:800; color:${brand.blueDeep};">${employee.name || "—"}</div>
          <div style="font-size:13px; color:#6B7280; margin-top:4px;">
            Employee No: ${employee.employeeNo || "—"} • ${employee.department || "—"} • ${employee.status || "—"}
          </div>
        </div>
        ${photoUrl ? `<img src="${photoUrl}" style="width:100px;height:100px;border-radius:12px;object-fit:cover;border:2px solid ${brand.gold};" />` : ""}
      </div>

      <div class="info-box">
        <div style="font-weight:700; color:${brand.blueDeep}; margin-bottom:10px;">Personal Information</div>
        <div class="info-grid">
          ${row("Father Name", employee.fatherName)}
          ${row("CNIC", employee.cnic)}
          ${row("Mobile", employee.mobile)}
          ${row("Family Mobile", employee.familyMobile)}
          ${row("Address", employee.address)}
        </div>
      </div>

      <div class="info-box">
        <div style="font-weight:700; color:${brand.blueDeep}; margin-bottom:10px;">Employment Information</div>
        <div class="info-grid">
          ${row("Appointment", employee.appointment)}
          ${row("Department", employee.department)}
          ${row("Joining Date", employee.joiningDate)}
          ${row("Employee Type", employee.employeeType)}
        </div>
      </div>

      <div class="info-box">
        <div style="font-weight:700; color:${brand.blueDeep}; margin-bottom:10px;">Salary &amp; Bank Information</div>
        <div class="info-grid">
          ${row("Gross Salary", employee.grossSalary ? `Rs. ${employee.grossSalary}` : "")}
          ${row("Bank Name", employee.bankName)}
          ${row("Account Title", employee.accountTitle)}
          ${row("IBAN", employee.iban)}
        </div>
      </div>

      <div class="info-box">
        <div style="font-weight:700; color:${brand.blueDeep}; margin-bottom:10px;">Material Status</div>
        <div class="info-grid">
          ${row("Marital Status", employee.maritalStatus)}
          ${row("Status", employee.status)}
          ${row("Employee Type", employee.employeeType)}
        </div>
      </div>

      ${employee.remarks ? `
      <div class="info-box">
        <div style="font-weight:700; color:${brand.blueDeep}; margin-bottom:10px;">Remarks</div>
        <div class="info-value">${employee.remarks}</div>
      </div>` : ""}
    `;

    printDocument({
      title: "Employee Profile",
      subtitle: `${localStorage.getItem("farm") || ""} • Employee No: ${employee.employeeNo || ""}`,
      bodyHtml,
    });
  };

  return (
    <MainLayout>
      <Box p={3}>

        {/* Top actions */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box
            onClick={() => navigate(-1)}
            sx={{
              display: "flex", alignItems: "center", gap: 1, cursor: "pointer",
              color: brand.blueDeep, fontWeight: 700, fontSize: 14,
            }}
          >
            <ArrowBack fontSize="small" /> Back to Employees
          </Box>

          <Box sx={{ display: "flex", gap: 1.2 }}>
            <Tooltip title="Print Profile">
              <IconButton
                onClick={handlePrint}
                sx={{
                  background: "#e8edf7", color: brand.blueDeep, border: `1px solid ${brand.blueDeep}33`,
                  "&:hover": { background: "#d9e0f0" },
                }}
              >
                <Print fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit Employee">
              <IconButton
                onClick={() => navigate(`/employees/edit/${id}`)}
                sx={{
                  background: gradients.brand, color: "#fff",
                  "&:hover": { background: gradients.brand, opacity: 0.9 },
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Profile Banner Card */}
        <Card elevation={0} sx={{ borderRadius: 4, overflow: "hidden", boxShadow: shadowCard, mb: 3, background: "#f0f4fa", border: "1px solid rgba(15,76,129,0.14)" }}>
          <Box sx={{
            background: gradients.brand, position: "relative", px: 4, pt: 5, pb: 8, overflow: "hidden",
          }}>
            <Box sx={{
              position: "absolute", top: -80, right: -60, width: 260, height: 260,
              borderRadius: "50%", background: "radial-gradient(circle, rgba(212,175,55,0.25), transparent 70%)"
            }} />
            <Grid container spacing={3} alignItems="center" sx={{ position: "relative", zIndex: 1 }}>
              <Grid item>
                <Avatar
                  variant="rounded"
                  src={employee.photo ? (employee.photo.startsWith("http") ? employee.photo : `${employee.photo}`) : undefined}
                  sx={{
                    width: 130, height: 150,
                    borderRadius: 3,
                    border: `3px solid ${brand.gold}`,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
                    fontSize: 40,
                  }}
                >{(employee.name || "?").charAt(0)}</Avatar>
              </Grid>
              <Grid item xs>
                <Box sx={{
                  display: "inline-flex", alignItems: "center", gap: 0.6,
                  px: 1.6, py: 0.4, borderRadius: 10,
                  background: "rgba(212,175,55,0.18)", border: `1px solid ${brand.gold}`,
                  fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.goldLight, mb: 1,
                }}>EMPLOYEE PROFILE</Box>
                <Typography variant="h4" fontWeight={800} sx={{ color: "#fff" }}>{employee.name || "—"}</Typography>
                <Box sx={{ display: "flex", gap: 1.2, mt: 1.5, flexWrap: "wrap" }}>
                  <Chip size="small" label={employee.status || "Unknown"}
                    sx={{ fontWeight: 700, color: "#fff", background: isActive ? brand.success : brand.danger }} />
                  <Chip size="small" icon={<BadgeIcon sx={{ color: "#fff !important" }} fontSize="small" />}
                    label={`Employee No: ${employee.employeeNo || "—"}`}
                    sx={{ fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.15)" }} />
                  <Chip size="small" icon={<Work sx={{ color: "#fff !important" }} fontSize="small" />}
                    label={employee.department || "—"}
                    sx={{ fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.15)" }} />
                </Box>
              </Grid>
            </Grid>
          </Box>
          <CardContent sx={{ mt: -5, position: "relative", zIndex: 2, px: 4, pb: 4, background: "#f0f4fa" }}>
            <Grid container spacing={2}>
              <StatChip icon={<Phone />} label="Mobile" value={employee.mobile} />
              <StatChip icon={<ContactPhone />} label="Family Mobile" value={employee.familyMobile} />
              <StatChip icon={<AccountBalanceWallet />} label="Gross Salary" value={employee.grossSalary ? `Rs. ${employee.grossSalary}` : "—"} />
              <StatChip icon={<CalendarMonth />} label="Joining Date" value={employee.joiningDate} />
              <StatChip icon={<Work />} label="Employee Type" value={employee.employeeType} />
            </Grid>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}
          sx={{
            mb: 3, minHeight: 48,
            p: 0.6, borderRadius: 3,
            background: brand.tableCardBg,
            border: `1px solid ${brand.tableCardBorder}`,
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.25)",
            "& .MuiTab-root": {
              textTransform: "none", fontWeight: 700, minHeight: 40,
              borderRadius: 2, mx: 0.4, px: 2.4, color: "rgba(255,255,255,0.7)",
            },
            "& .Mui-selected": {
              color: `${brand.ink} !important`,
              background: brand.gold,
              border: `1px solid ${brand.goldDark}`,
              boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
            },
            "& .MuiTabs-indicator": { display: "none" },
          }}>
          <Tab label="Profile" />
          <Tab label="View Document" />
        </Tabs>

        {activeTab === 0 && (
          /* FIX: CSS Grid ki madad se har card ki length bilkul equal hogi! */
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
            gridAutoRows: '1fr', // Ye magic line sab ki length barabar karegi
            gap: 3 
          }}>
            
            <InfoSection title="Personal Information" icon={<ContactPhone />} accentColor="#4A90D9">
              <InfoRow icon={<BadgeIcon />} label="Father Name" value={employee.fatherName} />
              <InfoRow icon={<Fingerprint />} label="CNIC" value={employee.cnic} />
              <InfoRow icon={<Phone />} label="Mobile" value={employee.mobile} />
              <InfoRow icon={<Phone />} label="Family Mobile" value={employee.familyMobile} />
              <InfoRow icon={<Home />} label="Address" value={employee.address} />
            </InfoSection>

            <InfoSection title="Employment Information" icon={<Work />} accentColor="#2FBF71">
              <InfoRow icon={<Work />} label="Appointment" value={employee.appointment} />
              <InfoRow icon={<Work />} label="Department" value={employee.department} />
              <InfoRow icon={<CalendarMonth />} label="Joining Date" value={employee.joiningDate} />
              <InfoRow icon={<BadgeIcon />} label="Employee Type" value={employee.employeeType} />
              <InfoRow icon={<Wc />} label="Marital Status" value={employee.maritalStatus} />
            </InfoSection>

            <InfoSection title="Salary & Bank Information" icon={<AccountBalanceWallet />} accentColor="#A24BD1">
              <InfoRow icon={<AccountBalanceWallet />} label="Gross Salary" value={employee.grossSalary ? `Rs. ${employee.grossSalary}` : ""} />
              <InfoRow icon={<AccountBalance />} label="Bank Name" value={employee.bankName} />
              <InfoRow icon={<BadgeIcon />} label="Account Title" value={employee.accountTitle} />
              <InfoRow icon={<Fingerprint />} label="IBAN" value={employee.iban} />
            </InfoSection>

            <InfoSection title="Material Status" icon={<People />} accentColor="#F59E0B">
              <InfoRow icon={<Wc />} label="Marital Status" value={employee.maritalStatus} />
              <InfoRow icon={<BadgeIcon />} label="Status" value={employee.status} />
              <InfoRow icon={<Work />} label="Employee Type" value={employee.employeeType} />
            </InfoSection>

          </Box>
        )}

        {activeTab === 1 && (
          <EmployeeDocuments employee={employee} employeeId={id} onChanged={loadEmployee} showToast={showToast} />
        )}
      </Box>
      {ToastUI}
    </MainLayout>
  );
}

/* ---- Sub-Components ---- */

function StatChip({ icon, label, value }) {
  return (
    <Grid item xs={6} sm={4} md={2.4}>
      <Box sx={{
        position: "relative",
        background: "#ffffff",
        border: `1px solid ${brand.gold}55`,
        borderTop: `3px solid ${brand.gold}`,
        borderRadius: 3,
        boxShadow: "0 10px 24px rgba(8,33,63,0.28)",
        p: 2,
        display: "flex", alignItems: "center", gap: 1.4,
        height: "100%", minHeight: 76, width: "100%",
        transition: "transform 0.15s, box-shadow 0.15s",
        "&:hover": { transform: "translateY(-3px)", boxShadow: "0 14px 30px rgba(8,33,63,0.35)" },
      }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: "50%",
          background: gradients.brand, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          boxShadow: `0 4px 12px rgba(15,76,129,0.4), 0 0 0 3px ${brand.gold}33`,
        }}>{icon}</Box>
        <Box sx={{ minWidth: 0, width: "100%" }}>
          <Typography sx={{ fontSize: 10.5, color: brand.goldDark, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" }}>
            {label}
          </Typography>
          <Typography sx={{ 
            fontSize: 14.5, fontWeight: 800, color: brand.blueDeep, 
            whiteSpace: "normal", wordBreak: "break-word", overflow: "visible", textOverflow: "clip"
          }}>
            {value || "—"}
          </Typography>
        </Box>
      </Box>
    </Grid>
  );
}

/* InfoSection mein flex:1 aur height:100% wala logic same rahega, bahar se CSS Grid stretch karega */
function InfoSection({ title, icon, children, accentColor }) {
  return (
    <Card elevation={0} sx={{
      borderRadius: 4, boxShadow: shadowCard, 
      height: "100%", // CSS Grid forcefully isay stretch karega
      display: 'flex', flexDirection: 'column', 
      background: "#f0f4fa",
      border: "1px solid rgba(15,76,129,0.14)",
      borderTop: `4px solid ${accentColor || brand.gold}`,
      overflow: "hidden",
    }}>
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1.2,
        px: 2.5, py: 1.5,
        background: brand.tableCardBg,
        borderBottom: `3px solid ${accentColor || brand.gold}`,
      }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: "8px",
          background: "rgba(255,255,255,0.14)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{icon}</Box>
        <Typography variant="h6" fontWeight={800} sx={{ color: "#fff", fontSize: 15 }}>
          {title}
        </Typography>
      </Box>
      <CardContent sx={{ p: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Grid container spacing={1.5} sx={{ flex: 1, alignContent: 'flex-start' }}>
          {children}
        </Grid>
      </CardContent>
    </Card>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <Grid item xs={6} md={2.4}>
      <Box sx={{
        display: "flex", gap: 0.8, alignItems: "center",
        border: "1px solid #c8d6e5", borderRadius: "6px",
        background: "#dfebfa", 
        p: 1,
        height: "100%", width: "100%"
      }}>
        <Box sx={{
          width: 24, height: 24, borderRadius: "6px", flexShrink: 0,
          background: `${brand.gold}18`, color: brand.goldDark,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{icon}</Box>
        <Box sx={{ minWidth: 0, width: "100%" }}>
          <Typography sx={{ fontSize: 9, color: brand.slate, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
            {label}
          </Typography>
          <Typography sx={{ 
            fontSize: 12, fontWeight: 600, color: brand.ink, 
            whiteSpace: "normal", wordBreak: "break-word"
          }}>
            {value || "—"}
          </Typography>
        </Box>
      </Box>
    </Grid>
  );
}