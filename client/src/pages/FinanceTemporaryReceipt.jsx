import { Box, Typography } from "@mui/material";
import MainLayout from "../layouts/MainLayout";
import TRTab from "../components/Finance/TRTab";
import { useToast } from "../utils/useToast";
import { brand } from "../theme";

export default function FinanceTemporaryReceipt() {
  const { showToast, ToastUI } = useToast();

  return (
    <MainLayout>
      <Box sx={{ p: 1 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={900} sx={{ color: brand.ink }}>
            Temporary Receipt (TR)
          </Typography>
          <Typography sx={{ color: brand.slate, fontWeight: 600, fontSize: 13.5 }}>
            Same temporary receipts as the Cash Book — every entry made here updates Cash in Hand, TR
            outstanding and Daily Closing exactly the same way.
          </Typography>
        </Box>

        <TRTab showToast={showToast} />
      </Box>
      {ToastUI}
    </MainLayout>
  );
}
