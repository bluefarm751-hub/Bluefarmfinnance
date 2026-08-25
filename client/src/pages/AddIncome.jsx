import { Box, Typography } from "@mui/material";
import MainLayout from "../layouts/MainLayout";
import SideTab from "../components/CashBook/SideTab";
import FarmSourceBadge from "../components/FarmSourceBadge";
import { useToast } from "../utils/useToast";
import { brand } from "../theme";

export default function AddIncome() {
  const { showToast, ToastUI } = useToast();

  return (
    <MainLayout>
      <Box sx={{ p: 1 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={900} sx={{ color: brand.ink }}>
            Add Income
          </Typography>
          <Typography sx={{ color: brand.slate, fontWeight: 600, fontSize: 13.5 }}>
            Milk Sale, Culling of Animals and other income entries. Every entry posts to the Cash Book
            Receipt Side and affects Cash in Hand, Cash in Bank and Daily Closing exactly as before.
          </Typography>
        </Box>

        <FarmSourceBadge type="INCOME" />

        <SideTab side="receipt" allowAdd showToast={showToast} />
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
