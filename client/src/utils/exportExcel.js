// Exports rows to a .csv file that opens natively and correctly in Excel.
// No external library needed.

export function exportExcel(filename, columns, rows) {
  const escape = (val) => {
    const s = val === null || val === undefined ? "" : String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = columns.map((c) => escape(c.label)).join(",");
  const lines = rows.map((row, i) =>
    columns
      .map((c) => escape(c.key === "__sno" ? i + 1 : row[c.key]))
      .join(",")
  );

  const csv = [header, ...lines].join("\r\n");
  // BOM so Excel opens UTF-8 (Urdu/English mixed names) correctly
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
