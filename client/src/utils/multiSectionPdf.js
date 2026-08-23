// A generic "multi-section report" PDF builder using jsPDF (already a
// project dependency — see contingentBillPdf.js).
//
// This intentionally mirrors the { columns, rows } shape used by
// exportXlsxMultiSheet (xlsxWriter.js), so any report that already builds a
// multi-sheet Excel workbook (Receipt Side / Payment Side / Outstanding TRs /
// Closing Summary, etc.) can hand the exact same `sheets` array here and get
// a matching multi-page PDF — one section per page — with no separate data
// building needed.
//
// section: { title, subtitle, columns: [{key,label,width?,align?}], rows }
//   - a row's __bold flag (same convention as xlsxWriter) bolds that row
//   - numeric values are right-aligned and thousand-separated automatically

import { jsPDF } from "jspdf";

const INK = [11, 27, 51]; // #0B1B33
const BORDER = [180, 188, 204];
const HEADER_FILL = [15, 76, 129]; // brand.blueDeep
const GOLD = [212, 175, 55]; // brand.gold
const MUTED = [107, 114, 128];

const MARGIN = 12;
const BOTTOM_LIMIT = 14; // keep this much clear space at the bottom of every page

function fmtCell(val) {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number" && Number.isFinite(val)) {
    return val.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  return String(val);
}

function isNumericCol(col, rows) {
  if (col.align) return col.align === "right";
  const sample = rows.find((r) => r[col.key] !== undefined && r[col.key] !== "");
  return typeof sample?.[col.key] === "number";
}

function drawSectionHeader(doc, pageW, title, subtitle) {
  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK);
  doc.text(title || "", pageW / 2, y, { align: "center" });
  y += 5;
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(subtitle, pageW / 2, y, { align: "center" });
    y += 4;
  }
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y + 1, pageW - MARGIN, y + 1);
  return y + 7;
}

function drawTable(doc, { columns, rows, startY, pageW, pageH, title, subtitle }) {
  const contentW = pageW - MARGIN * 2;
  const totalWeight = columns.reduce((t, c) => t + (c.width || 16), 0) || 1;
  const colWidths = columns.map((c) => ((c.width || 16) / totalWeight) * contentW);
  const colX = [];
  let cx = MARGIN;
  columns.forEach((c, i) => { colX.push(cx); cx += colWidths[i]; });
  const numericFlags = columns.map((c) => isNumericCol(c, rows));

  const headerH = 9;
  let y = startY;

  const drawHeaderRow = () => {
    doc.setFillColor(...HEADER_FILL);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, y, contentW, headerH, "FD");
    columns.forEach((c, i) => { if (i > 0) doc.line(colX[i], y, colX[i], y + headerH); });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    columns.forEach((c, i) => {
      const align = numericFlags[i] ? "right" : "left";
      const tx = align === "right" ? colX[i] + colWidths[i] - 2.5 : colX[i] + 2.5;
      doc.text(String(c.label || ""), tx, y + headerH / 2 + 1.2, { align, baseline: "middle" });
    });
    y += headerH;
  };

  drawHeaderRow();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  rows.forEach((row) => {
    const cellLines = columns.map((c, i) => doc.splitTextToSize(fmtCell(row[c.key]), colWidths[i] - 5));
    const maxLines = Math.max(1, ...cellLines.map((l) => l.length));
    const rowH = Math.max(7, maxLines * 4 + 3);

    if (y + rowH > pageH - BOTTOM_LIMIT) {
      doc.addPage();
      y = title ? drawSectionHeader(doc, pageW, `${title} (cont.)`, subtitle) : 16;
      drawHeaderRow();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    }

    const bold = !!row.__bold;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.25);
    doc.rect(MARGIN, y, contentW, rowH);
    columns.forEach((c, i) => { if (i > 0) doc.line(colX[i], y, colX[i], y + rowH); });

    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...INK);
    columns.forEach((c, i) => {
      const align = numericFlags[i] ? "right" : "left";
      const tx = align === "right" ? colX[i] + colWidths[i] - 2.5 : colX[i] + 2.5;
      doc.text(cellLines[i], tx, y + 5, { align });
    });

    y += rowH;
  });

  return y;
}

// sections: [{ title, subtitle, columns, rows }]
export function buildMultiSectionPdf({ sections, docTitle }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  (sections || []).forEach((section, idx) => {
    if (idx > 0) doc.addPage();
    const startY = drawSectionHeader(doc, pageW, section.title, section.subtitle);
    drawTable(doc, {
      columns: section.columns,
      rows: section.rows || [],
      startY,
      pageW,
      pageH,
      title: section.title,
      subtitle: section.subtitle,
    });
  });

  if (docTitle) doc.setProperties({ title: docTitle });
  return doc;
}

export function downloadMultiSectionPdf({ filename, sections, docTitle }) {
  const doc = buildMultiSectionPdf({ sections, docTitle });
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
