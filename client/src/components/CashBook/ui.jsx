import { Box, Typography } from "@mui/material";
import { brand } from "../../theme";

export const money = (v) => `Rs. ${Number(v || 0).toLocaleString()}`;
// Signed money: sign goes BEFORE the currency, e.g. -Rs. 5 / +Rs. 5
export const signedMoney = (v) => {
  const n = Math.round((Number(v) || 0) * 100) / 100;
  const abs = `Rs. ${Math.abs(n).toLocaleString()}`;
  if (n < 0) return `-${abs}`;
  if (n > 0) return `+${abs}`;
  return abs;
};
export const today = () => new Date().toISOString().slice(0, 10);

export function SectionCard({ title, action, children }) {
  return (
    <Box
      sx={{
        borderRadius: 4,
        background: "#fff",
        border: "1px solid rgba(15,76,129,0.14)",
        boxShadow: "0 10px 30px rgba(8,33,63,0.08)",
        overflow: "hidden",
        mb: 3,
      }}
    >
      {(title || action) && (
        <Box
          sx={{
            px: 2.5,
            py: 1.8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            background: "linear-gradient(90deg, #0F4C81 0%, #16608f 100%)",
          }}
        >
          <Typography sx={{ color: "#fff", fontWeight: 800, letterSpacing: 0.4, fontSize: 15 }}>
            {title}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>{action}</Box>
        </Box>
      )}
      <Box sx={{ p: 2.5 }}>{children}</Box>
    </Box>
  );
}

export function DataTable({ columns, rows, empty = "No records found", totalsRow }) {
  return (
    <Box sx={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{
                  background: brand.panel,
                  color: brand.ink,
                  textAlign: c.align || "left",
                  padding: "10px 12px",
                  fontWeight: 800,
                  borderBottom: `2px solid ${brand.gold}`,
                  whiteSpace: "nowrap",
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                style={{ padding: "26px 12px", textAlign: "center", color: brand.slate, fontWeight: 600 }}
              >
                {empty}
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={row.id ?? i} style={{ background: i % 2 ? "rgba(238,243,251,0.5)" : "#fff" }}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    padding: "9px 12px",
                    textAlign: c.align || "left",
                    borderBottom: "1px solid #E5E9F2",
                    color: brand.ink,
                  }}
                >
                  {c.render ? c.render(row, i) : (row[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          {totalsRow && rows.length > 0 && (
            <tr>
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    padding: "11px 12px",
                    textAlign: c.align || "left",
                    fontWeight: 800,
                    color: "#fff",
                    background: brand.blueDeep,
                  }}
                >
                  {totalsRow[c.key] ?? ""}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </Box>
  );
}
