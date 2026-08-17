import { useState, useCallback, useRef } from "react";
import { Dialog, Box, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { gradients } from "../theme";

export function useToast() {
  const [toast, setToast] = useState({ open: false, type: "success", msg: "" });
  const timerRef = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ open: true, type, msg });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, open: false }));
    }, 2200);
  }, []);

  const closeToast = useCallback(() => {
    clearTimeout(timerRef.current);
    setToast((t) => ({ ...t, open: false }));
  }, []);

  const isError = toast.type === "error";
  const isWarning = toast.type === "warning";

  const icon = isError ? (
    <ErrorIcon sx={{ color: "#fff", fontSize: 30 }} />
  ) : isWarning ? (
    <WarningAmberIcon sx={{ color: "#fff", fontSize: 30 }} />
  ) : (
    <CheckCircleIcon sx={{ color: "#fff", fontSize: 30 }} />
  );

  const bg = isError
    ? "linear-gradient(135deg,#C0392B,#8C1B3B)"
    : isWarning
      ? "linear-gradient(135deg,#B8860B,#D4AF37)"
      : gradients.brand;

  const ToastUI = (
    <Dialog
      open={toast.open}
      onClose={closeToast}
      PaperProps={{ sx: { borderRadius: 4, width: 340, overflow: "hidden" } }}
    >
      <Box sx={{ background: bg, py: 3, textAlign: "center" }}>
        <Box sx={{
          width: 58, height: 58, borderRadius: "50%", margin: "0 auto",
          background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </Box>
      </Box>

      <Box sx={{ textAlign: "center", py: 3, px: 2 }}>
        <Typography variant="h6" fontWeight={800}>
          {toast.msg}
        </Typography>
      </Box>
    </Dialog>
  );

  return { showToast, ToastUI };
}
