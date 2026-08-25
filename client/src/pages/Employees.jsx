import { useEffect, useState } from "react";

import MainLayout from "../layouts/MainLayout";
import { getEmployees } from "../api/employeeApi";
import {
  FaUsers,
  FaUserCheck,
  FaUserSlash,
  FaMoneyBillWave,
  FaShieldAlt,
} from "react-icons/fa";
import { brand, shadowCard, gradients } from "../theme";

import { Box, Grid, Typography } from "@mui/material";
import heroImg from "../assets/hero.png";

export default function Employees() {
  const farm = localStorage.getItem("farm") || "Blue Farm";

  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await getEmployees();
      setEmployees(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter((e) => e.status === "Active").length;
  const stoppedEmployees = employees.filter((e) => e.status !== "Active").length;

  let totalAmount = 0;
  employees.forEach((emp) => {
    const salary = parseFloat(emp.grossSalary);
    totalAmount += isNaN(salary) ? 0 : salary;
  });

  const cards = [
    {
      label: "Total Employee",
      value: totalEmployees,
      icon: <FaUsers size={30} />,
      gradient: "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)",
    },
    {
      label: "Active",
      value: activeEmployees,
      icon: <FaUserCheck size={30} />,
      gradient: "linear-gradient(135deg, #2FBF71 0%, #1B8A50 100%)",
    },
    {
      label: "Stop",
      value: stoppedEmployees,
      icon: <FaUserSlash size={30} />,
      gradient: "linear-gradient(135deg, #F0574D 0%, #C0392B 100%)",
    },
    {
      label: "Total Amount",
      value: `Rs. ${totalAmount.toLocaleString()}`,
      icon: <FaMoneyBillWave size={30} />,
      gradient: "linear-gradient(135deg, #A24BD1 0%, #7A1FA2 100%)",
    },
  ];

  return (
    <MainLayout>
      <Box sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
        {/* One large page card that fills the whole dashboard height */}
        <Box sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "calc(100vh - 150px)",
          background: "#fff",
          borderRadius: 5,
          p: { xs: 2.5, md: 3.5 },
          border: "1px solid rgba(8,33,63,0.08)",
          boxShadow: "0 24px 70px rgba(8,33,63,0.14)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Subtle corner gradient accent */}
          <Box sx={{
            position: "absolute", top: 0, right: 0, width: 320, height: 320,
            background: "radial-gradient(circle at 100% 0%, rgba(30,136,229,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <Box sx={{
            position: "absolute", bottom: 0, left: 0, width: 260, height: 260,
            background: "radial-gradient(circle at 0% 100%, rgba(212,175,55,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Elegant Welcome Card with Borders */}
          <Box sx={{
            textAlign: "center",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)",
            borderRadius: 4,
            py: 4,
            px: 3,
            mb: 3.5,
            border: "3px solid #D4AF37",
            boxShadow: "0 12px 40px rgba(102, 126, 234, 0.35), inset 0 2px 4px rgba(255,255,255,0.2)",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}>
            {/* Decorative shapes inside the colorful card */}
            <Box sx={{
              position: "absolute", top: -40, left: -40, width: 120, height: 120,
              borderRadius: "50%", background: "rgba(255,255,255,0.15)",
            }} />
            <Box sx={{
              position: "absolute", bottom: -30, right: -30, width: 100, height: 100,
              borderRadius: "50%", background: "rgba(255,255,255,0.1)",
            }} />
            <Box sx={{
              position: "absolute", top: "50%", right: 60, width: 60, height: 60,
              borderRadius: "50%", background: "rgba(255,255,255,0.08)",
            }} />

            <Typography sx={{ color: "#fff", fontSize: 15, mb: 0.5, position: "relative", zIndex: 1, textShadow: "0 1px 3px rgba(0,0,0,0.2)", letterSpacing: 0.8 }}>
              Welcome to
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ color: "#fff", mb: 0.5, position: "relative", zIndex: 1, textShadow: "0 2px 6px rgba(0,0,0,0.3)", letterSpacing: 0.5 }}>
              {farm} Management System
            </Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: 15, position: "relative", zIndex: 1, textShadow: "0 1px 3px rgba(0,0,0,0.2)", fontWeight: 500 }}>
              Human Resource &amp; Finance Management
            </Typography>
          </Box>

          {/* Dashboard Stat Cards with Borders */}
          <Grid container spacing={3} sx={{ flexShrink: 0 }}>
            {cards.map((c, idx) => (
              <Grid item xs={12} sm={6} md={3} key={c.label}>
                <Box sx={{
                  borderRadius: 4,
                  boxShadow: shadowCard,
                  background: c.gradient,
                  color: "#fff",
                  height: 210,
                  p: 3,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  overflow: "hidden",
                  border: "2px solid rgba(255,255,255,0.25)",
                  transition: "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s",
                  "&:hover": {
                    transform: "translateY(-6px) scale(1.02)",
                    boxShadow: "0 18px 45px rgba(8, 33, 63, 0.45)",
                  },
                }}>
                  <Box sx={{
                    width: 60, height: 60, borderRadius: "50%",
                    background: "rgba(255,255,255,0.22)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "2px solid rgba(255,255,255,0.3)",
                    boxShadow: "0 6px 14px rgba(0,0,0,0.12)",
                  }}>
                    {c.icon}
                  </Box>

                  <Box>
                    <Typography fontSize={15} fontWeight={600} sx={{ opacity: 0.95, letterSpacing: 0.3 }}>
                      {c.label}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ lineHeight: 1.1 }}>
                      {c.value}
                    </Typography>
                  </Box>

                  <Box sx={{
                    position: "absolute", right: -20, bottom: -20, width: 120, height: 120,
                    borderRadius: "50%", background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }} />
                  {/* Small index badge */}
                  <Box sx={{
                    position: "absolute", top: 14, right: 14,
                    width: 26, height: 26, borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800,
                  }}>
                    0{idx + 1}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Bottom info box — grows to fill remaining height */}
          <Box sx={{
            mt: 3.5,
            flex: 1,
            minHeight: 170,
            display: "flex",
            alignItems: "center",
            gap: 2.5,
            borderRadius: 4,
            p: { xs: 2.5, md: 3.5 },
            background: "linear-gradient(90deg, #f5f8ff 0%, #eef4ff 60%, #e7f0ff 100%)",
            border: "1px solid rgba(30,136,229,0.18)",
            position: "relative",
            overflow: "hidden",
          }}>
            <Box sx={{
              width: 72, height: 72, flexShrink: 0, borderRadius: 3,
              background: "linear-gradient(135deg, #1E88E5 0%, #1565C0 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff",
              boxShadow: "0 10px 24px rgba(21,101,192,0.35)",
            }}>
              <FaShieldAlt size={32} />
            </Box>

            <Box sx={{ position: "relative", zIndex: 1, maxWidth: 460 }}>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: "#12283f", mb: 0.6, letterSpacing: 0.2 }}>
                Welcome Administrator!
              </Typography>
              <Typography sx={{ fontSize: 15, color: "rgba(18,40,63,0.7)", lineHeight: 1.6, fontWeight: 500 }}>
                Manage your employees, payroll and financial records efficiently from one powerful dashboard.
              </Typography>
            </Box>

            <Box
              component="img"
              src={heroImg}
              alt=""
              sx={{
                position: "absolute", right: 0, bottom: 0, height: "100%",
                opacity: 0.35, objectFit: "cover",
                display: { xs: "none", md: "block" },
                pointerEvents: "none",
              }}
            />
          </Box>

        </Box>
      </Box>
    </MainLayout>
  );
}
