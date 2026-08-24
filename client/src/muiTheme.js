// Global MUI theme — every default white surface (Paper, Table, TextField,
// Select, Dialog, Card, etc.) is repointed to the blue family so nothing in
// the app renders as plain white anymore. Sidebar keeps its own navy/gold
// styling (inline in Sidebar.jsx); this file governs the main content area,
// which now uses the same blue family instead of white/off-white.
import { createTheme } from "@mui/material/styles";
import { brand } from "./theme";

const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: brand.blueDeep },
    secondary: { main: brand.gold },
    background: {
      // Page canvas
      default: brand.panel,
      // Cards / Paper / Table / Dialog / TextField surfaces
      paper: brand.panelSoft,
    },
    text: {
      primary: brand.ink,
      secondary: brand.slate,
    },
  },
  // Kept low on purpose — every sx `borderRadius: N` across the app is a
  // multiple of this value, so raising it (it used to be 10) is what made
  // cards, badges and dialogs render almost fully rounded/pill-shaped.
  // A small base value keeps corners just slightly rounded everywhere.
  shape: { borderRadius: 4 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundColor: brand.panelSoft, backgroundImage: "none" },
      },
    },
    MuiTableContainer: {
      styleOverrides: { root: { backgroundColor: brand.panelSoft } },
    },
    MuiTableCell: {
      styleOverrides: { root: { backgroundColor: "transparent" } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { backgroundColor: brand.panelSoft, backgroundImage: "none" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: brand.panelSoft },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: { backgroundColor: brand.panelSoft },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { backgroundColor: brand.panelSoft, backgroundImage: "none" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundColor: brand.panelSoft, backgroundImage: "none" },
      },
    },
  },
});

export default muiTheme;
