import { useState } from "react";
import {
  Box,
  Card,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  LinearProgress,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PrintIcon from "@mui/icons-material/Print";
import DeleteIcon from "@mui/icons-material/Delete";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";

import { brand, gradients, shadowCard } from "../theme";
import ConfirmDialog from "./ConfirmDialog";
import { deleteEmployeeDocument } from "../api/employeeApi";

// Files are served from the same origin as the app (via the Vite dev proxy
// in development, and by the same Express server in production), so we
// build URLs as relative paths instead of hardcoding a host/port. A
// hardcoded "http://localhost:3001" broke document preview/view whenever
// the backend wasn't reachable directly on that exact host/port (e.g. a
// different port, a packaged build, or a machine where direct access to
// that port is blocked) even though the proxied /api and /uploads routes
// worked fine.
const FILE_BASE = "";

const DOC_TYPES = [
  { key: "photo", label: "Employee Photo" },
  { key: "cnicCopy", label: "CNIC Copy" },
  { key: "policeVerification", label: "Police Verification" },
];

export default function EmployeeDocuments({ employee, employeeId, onChanged, showToast }) {
  const [progress, setProgress] = useState(null); // { label, percent, done }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);

  const docs = DOC_TYPES
    .map((d) => ({ ...d, url: employee[d.key] }))
    .filter((d) => !!d.url);

  const fullUrl = (path) => (path.startsWith("http") ? path : `${FILE_BASE}${path}`);
  const isImageFile = (path) => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(path || "");
  const isPdfFile = (path) => /\.pdf(\?.*)?$/i.test(path || "");

  const handleView = (doc) => setViewDoc(doc);

  const handleDownload = async (doc) => {
    setProgress({ label: doc.label, percent: 0, done: false });

    try {
      const response = await axios.get(fullUrl(doc.url), {
        responseType: "blob",
        onDownloadProgress: (evt) => {
          if (evt.total) {
            setProgress({
              label: doc.label,
              percent: Math.round((evt.loaded / evt.total) * 100),
              done: false,
            });
          }
        },
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = doc.url.split("/").pop();
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      setProgress({ label: doc.label, percent: 100, done: true });
      setTimeout(() => setProgress(null), 1200);
    } catch (err) {
      console.log(err);
      setProgress(null);
      if (showToast) showToast("Could not download document", "error");
    }
  };

  const handlePrint = (doc) => {
    const win = window.open(fullUrl(doc.url), "_blank");
    if (!win) return;
    win.onload = () => {
      setTimeout(() => win.print(), 400);
    };
  };

  const handleDeleteConfirmed = async () => {
    const type = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteEmployeeDocument(employeeId, type);
      if (showToast) showToast("Document deleted successfully", "success");
      if (onChanged) onChanged();
    } catch (err) {
      console.log(err);
      if (showToast) showToast("Unable to delete document", "error");
    }
  };

  return (
    <Box>
      {docs.length === 0 && (
        <Card elevation={0} sx={{ borderRadius: 4, boxShadow: shadowCard, p: 5, textAlign: "center" }}>
          <InsertDriveFileIcon sx={{ fontSize: 46, color: brand.slate, mb: 1 }} />
          <Typography color="text.secondary">No documents uploaded for this employee yet.</Typography>
        </Card>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 2.5 }}>
        {docs.map((doc) => (
          <Card key={doc.key} elevation={0} sx={{ borderRadius: 4, boxShadow: shadowCard, p: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <Box sx={{
                width: 44, height: 44, borderRadius: 2.5,
                background: `${brand.gold}22`, color: brand.goldDark,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {isPdfFile(doc.url) ? <PictureAsPdfIcon /> : <InsertDriveFileIcon />}
              </Box>
              <Typography fontWeight={700} sx={{ color: brand.ink }}>
                {doc.label}
              </Typography>
            </Box>

            {isImageFile(doc.url) && (
              <Box sx={{ mb: 2, borderRadius: 2, overflow: "hidden", border: "1px solid #EEF2F8", cursor: "pointer" }} onClick={() => handleView(doc)}>
                <img src={fullUrl(doc.url)} alt={doc.label} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
              </Box>
            )}

            {isPdfFile(doc.url) && (
              <Box
                onClick={() => handleView(doc)}
                sx={{
                  mb: 2, height: 120, borderRadius: 2, cursor: "pointer",
                  border: "1px solid #EEF2F8", background: "linear-gradient(135deg,#fff5f5,#fdeaea)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.5,
                }}
              >
                <PictureAsPdfIcon sx={{ fontSize: 38, color: "#c0392b" }} />
                <Typography variant="caption" fontWeight={700} sx={{ color: brand.slate }}>PDF Document</Typography>
              </Box>
            )}

            <Box sx={{ display: "flex", gap: 1 }}>
              <Tooltip title="View">
                <IconButton size="small" className="bf-action-view" onClick={() => handleView(doc)} sx={{ background: gradients.brand, color: "#fff", "&:hover": { opacity: 0.9, background: gradients.brand } }}>
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download">
                <IconButton size="small" onClick={() => handleDownload(doc)} sx={{ background: "#f7f9fc", color: brand.blueDeep, border: `1px solid ${brand.blueDeep}33` }}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Print">
                <IconButton size="small" onClick={() => handlePrint(doc)} sx={{ background: "#f7f9fc", color: brand.blueDeep, border: `1px solid ${brand.blueDeep}33` }}>
                  <PrintIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" className="bf-action-delete" onClick={() => setDeleteTarget(doc.key)} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Card>
        ))}
      </Box>

      {/* Download progress / done popup */}
      <Dialog
        open={!!progress}
        PaperProps={{ sx: { borderRadius: 4, width: 340, overflow: "hidden" } }}
      >
        <Box sx={{ background: gradients.brand, py: 3, textAlign: "center" }}>
          <Box sx={{
            width: 58, height: 58, borderRadius: "50%", margin: "0 auto",
            background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {progress?.done ? (
              <CheckCircleIcon sx={{ color: "#fff", fontSize: 30 }} />
            ) : (
              <DownloadIcon sx={{ color: "#fff", fontSize: 30 }} />
            )}
          </Box>
        </Box>
        <Box sx={{ textAlign: "center", py: 3, px: 3 }}>
          <Typography fontWeight={800} sx={{ mb: 1.5 }}>
            {progress?.done ? "Download Complete" : `Downloading ${progress?.label || ""}...`}
          </Typography>
          {!progress?.done && (
            <>
              <LinearProgress variant="determinate" value={progress?.percent || 0} sx={{ borderRadius: 5, height: 8, mb: 1 }} />
              <Typography variant="caption" color="text.secondary">{progress?.percent || 0}%</Typography>
            </>
          )}
        </Box>
      </Dialog>

      {/* Document viewer */}
      <Dialog
        open={!!viewDoc}
        onClose={() => setViewDoc(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}
      >
        <Box sx={{ background: gradients.brand, px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography fontWeight={800} sx={{ color: "#fff" }}>{viewDoc?.label}</Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="small" onClick={() => viewDoc && window.open(fullUrl(viewDoc.url), "_blank")}
              sx={{ color: "#fff", borderColor: "#ffffff66" }} variant="outlined">
              Open in new tab
            </Button>
            <IconButton size="small" onClick={() => setViewDoc(null)} sx={{ color: "#fff" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <Box sx={{ background: "#f4f7fc", p: 2, minHeight: 420 }}>
          {viewDoc && isPdfFile(viewDoc.url) && (
            <iframe
              title={viewDoc.label}
              src={fullUrl(viewDoc.url)}
              style={{ width: "100%", height: "72vh", border: "none", borderRadius: 12, background: "#dfebfa" }}
            />
          )}
          {viewDoc && isImageFile(viewDoc.url) && (
            <Box sx={{ textAlign: "center" }}>
              <img src={fullUrl(viewDoc.url)} alt={viewDoc.label}
                style={{ maxWidth: "100%", maxHeight: "72vh", borderRadius: 12, background: "#dfebfa" }} />
            </Box>
          )}
          {viewDoc && !isPdfFile(viewDoc.url) && !isImageFile(viewDoc.url) && (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <InsertDriveFileIcon sx={{ fontSize: 54, color: brand.slate, mb: 1 }} />
              <Typography color="text.secondary">Preview not available for this file type.</Typography>
            </Box>
          )}
        </Box>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this document?"
        message="Are you sure you want to delete this document? This action cannot be undone."
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
