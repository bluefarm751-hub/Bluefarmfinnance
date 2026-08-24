import { Box, Typography } from "@mui/material";
import { FaTools } from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import { brand, gradients } from "../theme";

export default function ComingSoon({ title }) {
  return (
    <MainLayout>
      <Box sx={{ px: 3, pt: 1, pb: 3 }}>
        <Box sx={{
          textAlign: "center",
          py: 8,
          borderRadius: 4,
          background: gradients.brand,
          border: `2px solid ${brand.gold}`,
        }}>
          <Box sx={{
            width: 70, height: 70, borderRadius: "50%", margin: "0 auto 16px",
            background: "rgba(255,255,255,0.14)", display: "flex",
            alignItems: "center", justifyContent: "center",
            border: "2px solid rgba(255,255,255,0.3)",
          }}>
            <FaTools size={28} color="#fff" />
          </Box>
          <Typography variant="h5" fontWeight={800} sx={{ color: "#fff", mb: 1 }}>
            {title}
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.85)" }}>
            This section is coming soon.
          </Typography>
        </Box>
      </Box>
    </MainLayout>
  );
}
