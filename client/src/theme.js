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
  panel: "#eef3fb",
  danger: "#C0392B",
  success: "#1E8E5A",
};

export const gradients = {
  // Overall app / login brand gradient
  brand: "linear-gradient(135deg, #08213f 0%, #0F4C81 55%, #0A8FDC 100%)",
  goldLine: "linear-gradient(90deg, #9C7A1E, #F4E5B2, #9C7A1E)",

  // Blue Farm = agriculture, cow -> blue & green
  blueFarm: "linear-gradient(135deg, #0F4C81 0%, #1976D2 45%, #1E8E5A 100%)",

  // Blue Remounts = cavalry / horses -> deep maroon & bronze/gold ("military remount" prestige feel)
  blueRemounts: "linear-gradient(135deg, #5C0E22 0%, #8C1B3B 45%, #B8860B 100%)",

  sidebar: "linear-gradient(180deg, #0F4C81 0%, #08213f 100%)",
};

export const shadowCard = "0 20px 50px rgba(8, 33, 63, 0.35)";

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
