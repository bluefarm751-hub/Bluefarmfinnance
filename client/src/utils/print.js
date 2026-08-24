// Opens a new window with a professionally formatted printable document and
// triggers the browser's print dialog (the user can choose "Save as PDF").
// This needs no extra dependency and produces a real, clean printable output.

import { brand } from "../theme";

export function printDocument({ title, subtitle, bodyHtml, landscape, backgroundImageUrl, hideHeader }) {
  const win = window.open("", "_blank", "width=900,height=1000");
  if (!win) return;

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${title || "Blue Farm Report"}</title>
      <style>
        * {
          box-sizing: border-box;
          /* Browsers skip background colors/images when printing unless told
             otherwise — without this, every colored cell/badge below prints
             as plain white. */
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        @page { size: ${landscape ? "landscape" : "portrait"}; margin: 14mm; }
        body {
          font-family: Arial, "Segoe UI", sans-serif;
          font-size: 12pt;
          color: #0B1B33;
          margin: 0;
          padding: 30px 36px;
          ${backgroundImageUrl ? `background-image: url("${backgroundImageUrl}"); background-repeat: repeat; background-size: 420px auto;` : ""}
        }
        .doc-header {
          position: relative;
          text-align: center;
          border-bottom: 3px solid ${brand.gold};
          padding-bottom: 14px;
          margin-bottom: 22px;
          ${backgroundImageUrl ? `background: rgba(255,255,255,0.94); border-radius: 10px; padding: 14px 16px 14px;` : ""}
        }
        .doc-header h1 {
          margin: 0;
          font-size: 16pt;
          font-family: Arial, sans-serif;
          color: ${brand.blueDeep};
        }
        .doc-header p {
          margin: 2px 0 0;
          font-size: 12pt;
          font-family: Arial, sans-serif;
          color: #4B5563;
        }
        .doc-badge {
          position: absolute;
          top: 0;
          right: 0;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1px;
          color: ${brand.goldDark};
          border: 1px solid ${brand.gold};
          border-radius: 20px;
          padding: 4px 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12pt;
          font-family: Arial, sans-serif;
          margin-top: 6px;
        }
        th {
          background: ${brand.blueDeep};
          color: #fff;
          text-align: left;
          padding: 9px 10px;
          font-size: 12pt;
          font-family: Arial, sans-serif;
          letter-spacing: 0.3px;
          border: 1px solid ${brand.blueDeep};
        }
        td {
          padding: 8px 10px;
          font-size: 12pt;
          font-family: Arial, sans-serif;
          border: 1px solid #C9D3E3;
          background: rgba(255,255,255,0.9);
        }
        tr:nth-child(even) td {
          background: rgba(247,250,255,0.92);
        }
        .info-box {
          border: 1px solid #E5E9F2;
          border-radius: 10px;
          padding: 16px 20px;
          margin-bottom: 14px;
          background: rgba(247,249,252,0.9);
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 14px;
        }
        .info-item {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          border: 1px solid #E5E9F2;
          border-radius: 8px;
          background: rgba(250,251,253,0.92);
          padding: 10px 12px;
        }
        .info-label {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.4px;
          color: #6B7280;
        }
        .info-value {
          font-size: 12pt;
          font-family: Arial, sans-serif;
          font-weight: 600;
          color: #0B1B33;
        }
        .doc-footer {
          margin-top: 28px;
          padding-top: 10px;
          border-top: 1px solid #E5E9F2;
          font-size: 10.5px;
          color: #4B5563;
          display: flex;
          justify-content: space-between;
          ${backgroundImageUrl ? `background: rgba(255,255,255,0.94); border-radius: 8px; padding: 10px 12px; border-top: none;` : ""}
        }
        @media print {
          .no-print { display: none; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      </style>
    </head>
    <body>
      ${
        hideHeader
          ? ""
          : `<div class="doc-header">
        <div>
          <h1>${title || ""}</h1>
          <p>${subtitle || ""}</p>
        </div>
        <div class="doc-badge">BLUE FARM</div>
      </div>`
      }

      ${bodyHtml}

      <div class="doc-footer">
        <span>Generated on ${new Date().toLocaleString()}</span>
        <span>Blue Farm Finance Management System</span>
      </div>
    </body>
    </html>
  `);

  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 400);
}

// Builds a printable HTML table from columns + rows
// Any bill/receipt field (Remarks, Party, Description, ...) can contain
// free-text typed by a user. Without escaping, text like `<img onerror=...>`
// saved in one of those fields would execute as real HTML/JS the next time
// this report is printed — escape every value before it goes into the
// document.write() HTML string.
function escapeHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function tableHtml(columns, rows) {
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = rows
    .map(
      (row, i) =>
        `<tr>${columns
          .map((c) => `<td>${c.key === "__sno" ? i + 1 : escapeHtml(row[c.key])}</td>`)
          .join("")}</tr>`
    )
    .join("");

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
