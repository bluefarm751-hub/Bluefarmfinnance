import { Dialog, DialogContent, Button, Box, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { brand, gradients } from "../theme";

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message = "Are you sure you want to delete this record?",
  confirmLabel = "Yes",
  cancelLabel = "No",
  danger = true,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{ sx: { borderRadius: 4, width: 380, overflow: "hidden" } }}
    >
      <Box sx={{ background: danger ? "linear-gradient(135deg,#C0392B,#8C1B3B)" : gradients.brand, py: 3, textAlign: "center" }}>
        <Box sx={{
          width: 58, height: 58, borderRadius: "50%", margin: "0 auto",
          background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <WarningAmberIcon sx={{ color: "#fff", fontSize: 30 }} />
        </Box>
      </Box>

      <DialogContent sx={{ textAlign: "center", pt: 3, pb: 3 }}>
        <Typography variant="h6" fontWeight={800} sx={{ color: brand.ink, mb: 1 }}>
          {title}
        </Typography>
        <Typography sx={{ color: brand.slate, fontSize: 14, mb: 3 }}>
          {message}
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={onCancel}
            sx={{ borderRadius: 2, fontWeight: 700, py: 1.1 }}
          >
            {cancelLabel}
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={onConfirm}
            sx={{
              borderRadius: 2, fontWeight: 700, py: 1.1,
              background: danger ? "linear-gradient(135deg,#C0392B,#8C1B3B)" : gradients.brand,
              "&:hover": { opacity: 0.92, background: danger ? "linear-gradient(135deg,#C0392B,#8C1B3B)" : gradients.brand },
            }}
          >
            {confirmLabel}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
