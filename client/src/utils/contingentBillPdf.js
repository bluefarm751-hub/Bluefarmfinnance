// Builds the "Contingent Bill / Bills Payment Summary Voucher" as a real
// vector PDF using jsPDF. Because the on-screen preview, the printed page,
// and the downloaded file are all produced by this exact same drawing code,
// there is no possibility of the print output drifting from the preview —
// unlike the old window.print() approach, this never lets the browser add
// its own page title/date header or footer to the output.

import { jsPDF } from "jspdf";

const INK = [11, 27, 51]; // #0B1B33
const BORDER = [58, 74, 102]; // darker, clearly visible box border
const HEADER_FILL = [15, 76, 129]; // brand.blueDeep
const GOLD = [212, 175, 55]; // brand.gold
const MUTED = [107, 114, 128];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 16;
const CONTENT_W = PAGE_W - MARGIN_X * 2;
const SPACE = 6; // one standard vertical spacing unit used across the voucher
const BORDER_WIDTH = 0.35;

function formatDateDMY(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-US");
}

// Draws a two-column label/value box row and returns the new Y.
function drawInfoRow(doc, x, y, w, label, value, opts = {}) {
  const labelW = opts.labelW ?? w * 0.32;
  const h = opts.height ?? 8;
  const bold = opts.valueBold;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(BORDER_WIDTH);
  doc.rect(x, y, labelW, h);
  doc.rect(x + labelW, y, w - labelW, h);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(label, x + 3, y + h / 2 + 1.4, { baseline: "middle" });

  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.text(String(value ?? ""), x + labelW + 4, y + h / 2 + 1.4, { baseline: "middle" });

  return y + h;
}

// Sorts bill items by date (oldest first) so the printed voucher is always
// date-ordered even if the rows were entered out of order. Items without a
// date are kept, in their original order, after every dated item — sort is
// stable so same-date rows keep the order they were entered in.
function sortItemsByDate(items) {
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => {
      const da = a.it.billDate || "";
      const db = b.it.billDate || "";
      if (!da && !db) return a.i - b.i;
      if (!da) return 1;
      if (!db) return -1;
      if (da === db) return a.i - b.i;
      return da < db ? -1 : 1;
    })
    .map(({ it }) => it);
}

export function buildContingentBillPdf(bill, farmLabel) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const items = sortItemsByDate(bill.items || []);
  let y = 22; // heading nudged slightly downward from the very top of the page

  // --- Main heading (single heading only — no separate small title above it) ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text("CONTINGENT BILL", PAGE_W / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(11.5);
  doc.text(String(farmLabel || "").toUpperCase(), PAGE_W / 2, y, { align: "center" });
  y += 3.5;

  // stylish full-width accent rule under the heading block — a bold gold
  // rule spanning the full content width, left to right, with a slim
  // companion line beneath it for a refined double-rule look.
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.9);
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.25);
  doc.line(MARGIN_X, y + 1.3, PAGE_W - MARGIN_X, y + 1.3);

  // generous, clearly increased spacing before the Voucher No / Month / Head box
  y += SPACE * 2.2;

  // --- Voucher No / Month-Year / Payment Head box (right aligned) ---
  const infoBoxW = 94;
  const infoBoxX = MARGIN_X + CONTENT_W - infoBoxW;
  y = drawInfoRow(doc, infoBoxX, y, infoBoxW, "Voucher No", bill.voucherNo || "", { labelW: 34, height: 7 });
  y = drawInfoRow(doc, infoBoxX, y, infoBoxW, "Month / Year", `${bill.month || ""} ${bill.year || ""}`.trim(), { labelW: 34, height: 7 });
  y = drawInfoRow(doc, infoBoxX, y, infoBoxW, "Payment Head", bill.headName || "MISC (NON-RECURRING)", { valueBold: true, labelW: 34, height: 7 });

  // one proper extra space unit after the top small box, before the section title
  y += SPACE * 2;

  // --- Section title ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  doc.text("BILLS PAYMENT SUMMARY VOUCHER", PAGE_W / 2, y, { align: "center" });
  y += SPACE - 1;

  // --- Payment to M/S + Authority ---
  y = drawInfoRow(doc, MARGIN_X, y, CONTENT_W, "Payment to M/S", bill.paymentToMS || "", { labelW: 40, height: 9 });
  y = drawInfoRow(doc, MARGIN_X, y, CONTENT_W, "Authority", bill.authority || "", { labelW: 40, height: 9 });

  y += SPACE - 2;

  // --- Bill rows table ---
  const colX = {
    no: MARGIN_X,
    date: MARGIN_X + 16,
    desc: MARGIN_X + 16 + 24,
    amount: MARGIN_X + CONTENT_W - 34,
  };
  const colW = { no: 16, date: 24, desc: CONTENT_W - 16 - 24 - 34, amount: 34 };
  const headerH = 8;

  const drawTableHeader = () => {
    doc.setFillColor(...HEADER_FILL);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(BORDER_WIDTH);
    doc.rect(MARGIN_X, y, CONTENT_W, headerH, "FD");
    doc.setDrawColor(...BORDER);
    doc.line(colX.date, y, colX.date, y + headerH);
    doc.line(colX.desc, y, colX.desc, y + headerH);
    doc.line(colX.amount, y, colX.amount, y + headerH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Bill No", colX.no + colW.no / 2, y + headerH / 2 + 1.4, { align: "center", baseline: "middle" });
    doc.text("Date", colX.date + colW.date / 2, y + headerH / 2 + 1.4, { align: "center", baseline: "middle" });
    doc.text("Description", colX.desc + 3, y + headerH / 2 + 1.4, { baseline: "middle" });
    doc.text("Amount", colX.amount + colW.amount - 3, y + headerH / 2 + 1.4, { align: "right", baseline: "middle" });
    y += headerH;
  };

  const ensureRoom = (needed) => {
    if (y + needed > PAGE_H - 20) {
      doc.addPage();
      y = 16;
      drawTableHeader();
    }
  };

  // Generic page-break check for sections that are not part of the item
  // table (so it must not redraw the table header).
  const ensurePlainRoom = (needed) => {
    if (y + needed > PAGE_H - 20) {
      doc.addPage();
      y = 16;
    }
  };

  drawTableHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);

  items.forEach((it, i) => {
    const descLines = doc.splitTextToSize(String(it.description || ""), colW.desc - 6);
    const rowH = Math.max(8, descLines.length * 4.6 + 3.4);
    ensureRoom(rowH);

    // ensureRoom() may have started a new page and drawn the (white-on-blue)
    // table header — always restore normal row text styling before drawing.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);

    doc.setDrawColor(...BORDER);
    doc.setLineWidth(BORDER_WIDTH);
    doc.rect(MARGIN_X, y, CONTENT_W, rowH);
    doc.line(colX.date, y, colX.date, y + rowH);
    doc.line(colX.desc, y, colX.desc, y + rowH);
    doc.line(colX.amount, y, colX.amount, y + rowH);

    doc.text(String(it.billNo || i + 1), colX.no + colW.no / 2, y + 5.4, { align: "center" });
    doc.text(formatDateDMY(it.billDate), colX.date + colW.date / 2, y + 5.4, { align: "center" });
    doc.text(descLines, colX.desc + 3, y + 5.4);
    doc.text(fmtNum(it.amount), colX.amount + colW.amount - 3, y + 5.4, { align: "right" });

    y += rowH;
  });

  // Total row
  ensureRoom(9);
  doc.setTextColor(...INK);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(BORDER_WIDTH);
  doc.rect(MARGIN_X, y, CONTENT_W, 9);
  doc.line(colX.amount, y, colX.amount, y + 9);
  doc.setFont("helvetica", "bold");
  doc.text("Total", MARGIN_X + (colX.amount - MARGIN_X) / 2, y + 5.9, { align: "center" });
  doc.text(fmtNum(bill.totalAmount), colX.amount + colW.amount - 3, y + 5.9, { align: "right" });
  y += 9;

  // Rupees-in-words row — extra height + centered text so wrapped wording
  // never touches the top/bottom border of the box. Label column widened so
  // "Rupees" doesn't crowd the divider line, and the amount-in-words is now
  // bold to match the weight of the Total row above it.
  const rupeesLabelW = 22;
  const rupeesLines = doc.splitTextToSize(String(bill.amountInWords || ""), CONTENT_W - rupeesLabelW - 8);
  const rupeesH = Math.max(11, rupeesLines.length * 4.6 + 5.4);
  ensureRoom(rupeesH);
  doc.setTextColor(...INK);
  doc.setDrawColor(...BORDER);
  doc.rect(MARGIN_X, y, CONTENT_W, rupeesH);
  doc.line(MARGIN_X + rupeesLabelW, y, MARGIN_X + rupeesLabelW, y + rupeesH);
  doc.setFont("helvetica", "bold");
  doc.text("Rupees", MARGIN_X + 3, y + rupeesH / 2 + 1.4, { baseline: "middle" });
  doc.text(rupeesLines, MARGIN_X + rupeesLabelW + 4, y + rupeesH / 2 - (rupeesLines.length - 1) * 2.3 + 1.4, {
    baseline: "middle",
  });
  y += rupeesH;

  y += SPACE * 1.6;

  // --- Cheque No / Received By / Sign block (right aligned) ---
  // Height is computed from the actual rows this block will draw (instead of
  // a fixed guess) so the page-break decision matches reality: an
  // over-estimate here was pushing this whole block — Rank included — onto a
  // fresh blank page by itself (with no title above it) even when it would
  // have comfortably fit under the item table on the current page.
  const sigBoxW = 96;
  const chequeLabelW = 40;
  const chequeRowH = bill.chequeDate ? 13 : 8;
  const sigBlockHeight =
    chequeRowH + // Vide Cheque No
    12 + // Received By (Sig)
    8 + // Name
    8 + // Rank
    SPACE * 1.9 + // gap before COUNTERSIGNED
    7 + // COUNTERSIGNED line
    SPACE * 0.6 + // gap before Paid By
    6; // Paid By line
  ensurePlainRoom(sigBlockHeight);
  const sigBoxX = MARGIN_X + CONTENT_W - sigBoxW;

  // "Prepared By :-" — left side, level with the top of the cheque box.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...INK);
  doc.text("Prepared By :-", MARGIN_X, y + chequeRowH / 2 + 1.4, { baseline: "middle" });

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(BORDER_WIDTH);
  doc.rect(sigBoxX, y, chequeLabelW, chequeRowH);
  doc.rect(sigBoxX + chequeLabelW, y, sigBoxW - chequeLabelW, chequeRowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text("Vide Cheque No", sigBoxX + 3, y + chequeRowH / 2 + 1.4, { baseline: "middle" });
  if (bill.chequeDate) {
    doc.setFont("helvetica", "normal");
    doc.text(String(bill.chequeNo || ""), sigBoxX + chequeLabelW + 4, y + 5.6);
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(`Dated. ${formatDateDMY(bill.chequeDate)}`, sigBoxX + chequeLabelW + 4, y + 10.2);
  } else {
    doc.text(String(bill.chequeNo || ""), sigBoxX + chequeLabelW + 4, y + chequeRowH / 2 + 1.4, { baseline: "middle" });
  }
  y += chequeRowH;

  // First box — label column widened so the divider line clears the
  // "Received By (Sig)" text instead of touching it. Same width as the
  // cheque box above and the Name/Rank rows below so the vertical divider
  // runs in one straight line down the whole block.
  y = drawInfoRow(doc, sigBoxX, y, sigBoxW, "Received By (Sig)", "", { labelW: 40, height: 12 });
  // Center box — left exactly unchanged in every way except the label
  // column width, which now matches the rest of the block.
  y = drawInfoRow(doc, sigBoxX, y, sigBoxW, "Name", bill.receivedByName || "", { labelW: 40, height: 8 });
  // Last box — given a touch more height so the label no longer sits on
  // the border ("Sign" row removed, so this is the final box in the block).
  y = drawInfoRow(doc, sigBoxX, y, sigBoxW, "Rank", bill.receivedByRank || "", { labelW: 40, height: 8 });
  // "Sign" row intentionally removed.

  // --- Countersigned — moved down a touch further from the boxes above it. ---
  y += SPACE * 1.9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...INK);
  doc.text("COUNTERSIGNED", PAGE_W / 2, y, { align: "center" });

  // "Paid By :-" — left side, below the Countersigned line, moved up further.
  y += SPACE * 0.6;
  doc.text("Paid By :-", MARGIN_X, y);

  doc.setProperties({ title: `Contingent Bill ${bill.voucherNo || ""}`.trim() });

  return doc;
}

export function downloadContingentBillPdf(bill, farmLabel, filename) {
  const doc = buildContingentBillPdf(bill, farmLabel);
  doc.save(filename || `Contingent_Bill_${bill.voucherNo || bill.id || "voucher"}.pdf`);
}

// Prints the voucher via a hidden iframe pointed at the generated PDF, so
// the browser's own PDF viewer handles printing the finished document
// as-is — with no injected page title/date header, exactly matching what
// the PDF looks like on screen.
export function printContingentBillPdf(bill, farmLabel) {
  const doc = buildContingentBillPdf(bill, farmLabel);
  const blobUrl = doc.output("bloburl");

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = blobUrl;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch {
        window.open(blobUrl, "_blank");
      }
    }, 300);
  };

  // clean up the iframe well after the print dialog would have opened
  setTimeout(() => {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }, 60000);
}
