import { Dialog, DialogContent, Button, Box, Typography } from "@mui/material";
import { GiPadlock } from "react-icons/gi";
import { FaUserShield, FaPhoneAlt } from "react-icons/fa";
import { brand, gradients } from "../theme";

export default function LockedDialog({ open, onClose, tabName }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderRadius: 4, width: 380, overflow: "hidden" } }}
    >
      <Box sx={{ background: gradients.brand, py: 3.5, textAlign: "center" }}>
        <Box sx={{
          width: 62, height: 62, borderRadius: "50%", margin: "0 auto",
          background: "rgba(212,175,55,0.2)", border: `2px solid ${brand.gold}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <GiPadlock size={28} color={brand.goldLight} />
        </Box>
      </Box>

      <DialogContent sx={{ textAlign: "center", pt: 3, pb: 3 }}>
        <Typography variant="h6" fontWeight={800} sx={{ color: brand.ink, mb: 1 }}>
          {tabName ? `${tabName} is Locked` : "This section is locked"}
        </Typography>
        <Typography sx={{ color: brand.slate, fontSize: 14, mb: 2.5 }}>
          This feature has been locked by Admin. Please contact your administrator for access.
        </Typography>

        {/* Admin contact details */}
        <Box
          sx={{
            textAlign: "left",
            borderRadius: 2.5,
            p: 2,
            mb: 2.5,
            background: "rgba(15,76,129,0.06)",
            border: `1px solid rgba(212,175,55,0.45)`,
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: brand.blueDeep,
              mb: 1,
            }}
          >
            Admin
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 0.8 }}>
            <FaUserShield color={brand.blueDeep} />
            <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: brand.ink }}>
              M Kamran
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
            <FaPhoneAlt color={brand.blueDeep} />
            <Typography
              component="a"
              href="tel:03099565960"
              sx={{ fontSize: 14, fontWeight: 600, color: brand.blueDeep, textDecoration: "none" }}
            >
              Mob# 03099565960
            </Typography>
          </Box>
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={onClose}
          sx={{
            borderRadius: 2, fontWeight: 700, py: 1.1,
            background: gradients.brand,
            "&:hover": { opacity: 0.92, background: gradients.brand },
          }}
        >
          Okay, Got It
        </Button>
      </DialogContent>
    </Dialog>
  );
}
