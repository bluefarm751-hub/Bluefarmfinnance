// Shared brand palette — keeps the brand look consistent across every page.

export const brand = {
  navy: "#08213f",
  blueDeep: "#0F4C81",
  blueBright: "#0A8FDC",
  gold: "#D4AF37",
  goldLight: "#F4E5B2",
  goldDark: "#9C7A1E",
  ink: "#0B1B33",
  slate: "#6B7280",
  // Page canvas — a clear blue tint, no white left in it.
  panel: "#cfe0f7",
  // Card / Paper / TextField surfaces — slightly lighter than the page so
  // boxes still stand out, but stays in the same blue family (never white).
  panelSoft: "#dfebfa",
  // Typing caret (text cursor) colour for every input in the app.
  caret: "#0A8FDC",
  danger: "#C0392B",
  success: "#1E8E5A",

  // ---- Confirmed table/card design (Cash Book style boxes) ----
  // Outer box that wraps a table (e.g. "Recent entries" style panels).
  tableCardBg: "#1c4f7e",
  tableCardBorder: "#123a63",
  tableCardHeaderText: "#ffffff",
  // Alternating row colours — both light, neither one reads as white,
  // and both sit clearly apart from the dark tableCardBg.
  rowBlue: "#8FCBEF",
  rowWhiteGradient: "linear-gradient(90deg,#ffffff,#eef4fb)",
  rowText: "#062a45",
  rowTextOnWhite: "#1c4f7e",
  // Action button colours — bright enough to never blend into tableCardBg.
  buttonSave: "#2FBF71",
  buttonSaveText: "#0a3319",
  buttonCancel: "#F0574D",
  buttonCancelText: "#4a0f0b",
  buttonEdit: "#F4C542",
  buttonEditText: "#3a2c05",
};

export const gradients = {
  // Overall app / login brand gradient
  brand: "linear-gradient(135deg, #08213f 0%, #0F4C81 55%, #0A8FDC 100%)",
  goldLine: "linear-gradient(90deg, #9C7A1E, #F4E5B2, #9C7A1E)",

  // Blue Farm = agriculture, cow -> blue & green
  blueFarm: "linear-gradient(135deg, #0F4C81 0%, #1976D2 45%, #1E8E5A 100%)",

  // Blue Remounts = cavalry / horses -> deep maroon & bronze/gold ("military remount" prestige feel)
  blueRemounts: "linear-gradient(135deg, #5C0E22 0%, #8C1B3B 45%, #B8860B 100%)",

  // Sidebar — a clearly blue dark shade (not near-black navy), matching
  // the top bar's blue family so the whole shell reads as one blue theme.
  sidebar: `linear-gradient(180deg, ${brand.blueDeep} 0%, #0A3868 100%)`,
  // Top bar — the exact same two colours as the sidebar, but running
  // left→right instead of top→bottom: the edge touching the sidebar reads
  // sky blue (blueBright), the far edge reads dark blue (matching the
  // sidebar's bottom shade), with no blended/mixed tone in between.
  topbar: `linear-gradient(90deg, ${brand.blueBright} 0%, ${brand.blueDeep} 55%, #0A3868 100%)`,
};

export const shadowCard = "0 20px 50px rgba(8, 33, 63, 0.35)";

// ---- Shared MUI <TableRow> styling — keeps every data table across the
// app (AddAllocation, BillReport, EditBill, EditHead, ReportAllocation,
// AddContingentBillFromExisting, etc.) matching the Cash Book table look:
// dark blue header + gold underline, alternating rowBlue / rowWhiteGradient body rows.
export const tableHeadRowSx = {
  background: brand.tableCardBg,
  "& .MuiTableCell-root": {
    color: brand.tableCardHeaderText,
    fontWeight: 800,
    borderBottom: `2px solid ${brand.gold}`,
  },
};

// Pass the row index; spreads onto a MUI <TableRow sx={{...}}>.
export const tableBodyRowSx = (i) => ({
  background: i % 2 ? brand.rowWhiteGradient : brand.rowBlue,
  "& .MuiTableCell-root": {
    color: i % 2 ? brand.rowTextOnWhite : brand.rowText,
    borderBottom: "1px solid rgba(8,33,63,0.18)",
    borderRight: "1px solid rgba(8,33,63,0.10)",
  },
  "& .MuiTableCell-root:last-of-type": { borderRight: "none" },
});

// MUI DataGrid equivalent — spread into the DataGrid's sx prop.
// v9's column header cells each paint their own background, so the dark
// fill + white text has to be set on the individual cell/title/icon
// classes too, not just the row-level wrapper, or it falls back to a
// pale default background with unreadable white text on top of it.
export const dataGridThemeSx = {
  border: 0,
  "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-columnHeadersInner, & .MuiDataGrid-columnHeader": {
    background: `${brand.tableCardBg} !important`,
    borderBottom: `2px solid ${brand.gold}`,
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    color: `${brand.tableCardHeaderText} !important`,
    fontWeight: 800,
  },
  "& .MuiDataGrid-columnHeader, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": {
    outline: "none",
  },
  "& .MuiDataGrid-iconButtonContainer .MuiSvgIcon-root, & .MuiDataGrid-menuIcon .MuiSvgIcon-root, & .MuiDataGrid-sortIcon": {
    color: brand.tableCardHeaderText,
  },
  "& .MuiDataGrid-columnSeparator": { color: "rgba(255,255,255,0.3)" },
  // Every row/cell now reads as a bordered box instead of a borderless
  // strip, and long values wrap onto a 2nd line instead of being cut off
  // with an ellipsis.
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid rgba(8,33,63,0.18)",
    borderRight: "1px solid rgba(8,33,63,0.10)",
    whiteSpace: "normal",
    wordBreak: "break-word",
    lineHeight: 1.3,
    display: "flex",
    alignItems: "center",
    padding: "8px 10px",
  },
  "& .MuiDataGrid-cell:last-of-type": { borderRight: "none" },
  "& .MuiDataGrid-columnHeader": { borderRight: "1px solid rgba(255,255,255,0.14)" },
  "& .MuiDataGrid-columnHeader:last-of-type": { borderRight: "none" },
  "& .MuiDataGrid-row": { borderBottom: "1px solid rgba(8,33,63,0.10)" },
  "& .MuiDataGrid-row.row-even, & .MuiDataGrid-row.row-even .MuiDataGrid-cell": { background: brand.rowBlue, color: brand.rowText },
  "& .MuiDataGrid-row.row-odd, & .MuiDataGrid-row.row-odd .MuiDataGrid-cell": { background: brand.rowWhiteGradient, color: brand.rowTextOnWhite },
  // Row hover — a light golden highlight (matching the rest of the app's
  // gold accent) instead of the dark blue that used to swallow the row.
  "& .MuiDataGrid-row:hover, & .MuiDataGrid-row:hover .MuiDataGrid-cell": { background: `${brand.goldLight} !important`, color: `${brand.rowText} !important` },
  "& .MuiDataGrid-footerContainer": { background: brand.panel },
};

// Fine diagonal hairline texture — used behind hero/dark panels for a
// premium, engraved-paper feel instead of a flat gradient.
export const diagonalPattern =
  "repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 26px)";

// Small foil corner ribbon, e.g. absolute-positioned inside a card.
export const ribbonStyle = {
  position: "absolute",
  top: 18,
  right: -34,
  transform: "rotate(40deg)",
  width: 140,
  textAlign: "center",
  padding: "4px 0",
  background: "linear-gradient(90deg, #9C7A1E, #D4AF37 45%, #F4E5B2 55%, #9C7A1E)",
  color: "#2b1e05",
  fontSize: 10.5,
  fontWeight: 800,
  letterSpacing: 1.5,
  boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
  zIndex: 3,
};
