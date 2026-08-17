// Builds the printable "Contingent Bill / Bills Payment Summary Voucher" HTML,
// laid out to match the physical form (Voucher No / Month-Year / Payment Head
// box, Payment to M/S + Authority table, bill rows table, Rupees-in-words,
// cheque + received-by + countersigned block).

export function contingentBillVoucherHtml(bill, farmLabel) {
  const items = bill.items || [];
  const rows = items
    .map(
      (it, i) => `
      <tr>
        <td style="text-align:center;">${it.billNo || i + 1}</td>
        <td style="text-align:center;">${formatDateDMY(it.billDate)}</td>
        <td>${escapeHtml(it.description || "")}</td>
        <td style="text-align:right;">${Number(it.amount || 0).toLocaleString()}</td>
      </tr>`
    )
    .join("");

  return `
    <div style="text-align:center; margin-bottom: 18px;">
      <div style="font-weight:800; font-size:14pt; letter-spacing:0.5px;">CONTINGENT BILL</div>
      <div style="font-weight:700; font-size:12pt; margin-top:2px;">${escapeHtml((farmLabel || "").toUpperCase())}</div>
    </div>

    <table style="width:auto; margin-left:auto; margin-bottom: 20px; border-collapse:collapse;">
      <tr>
        <td style="border:1px solid #C9D3E3; padding:6px 12px; font-weight:700;">Voucher No</td>
        <td style="border:1px solid #C9D3E3; padding:6px 30px;">${escapeHtml(bill.voucherNo || "")}</td>
      </tr>
      <tr>
        <td style="border:1px solid #C9D3E3; padding:6px 12px; font-weight:700;">Month / Year</td>
        <td style="border:1px solid #C9D3E3; padding:6px 30px;">${escapeHtml(bill.month || "")} ${escapeHtml(bill.year || "")}</td>
      </tr>
      <tr>
        <td style="border:1px solid #C9D3E3; padding:6px 12px; font-weight:700;">Payment Head</td>
        <td style="border:1px solid #C9D3E3; padding:6px 30px; font-weight:700;">${escapeHtml(bill.headName || "MISC (NON-RECURRING)")}</td>
      </tr>
    </table>

    <div style="text-align:center; font-weight:800; font-size:12.5pt; margin-bottom:14px;">
      BILLS PAYMENT SUMMARY VOUCHER
    </div>

    <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
      <tr>
        <td style="border:1px solid #C9D3E3; padding:8px 12px; font-weight:700; width:160px;">Payment to M/S</td>
        <td style="border:1px solid #C9D3E3; padding:8px 12px;">${escapeHtml(bill.paymentToMS || "")}</td>
      </tr>
      <tr>
        <td style="border:1px solid #C9D3E3; padding:8px 12px; font-weight:700;">Authority</td>
        <td style="border:1px solid #C9D3E3; padding:8px 12px;">${escapeHtml(bill.authority || "")}</td>
      </tr>
    </table>

    <table style="width:100%; border-collapse:collapse; margin-bottom:4px;">
      <thead>
        <tr>
          <th style="border:1px solid #C9D3E3; padding:8px; width:70px;">Bill No</th>
          <th style="border:1px solid #C9D3E3; padding:8px; width:100px;">Date</th>
          <th style="border:1px solid #C9D3E3; padding:8px; text-align:left;">Description</th>
          <th style="border:1px solid #C9D3E3; padding:8px; width:130px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr>
          <td colspan="3" style="border:1px solid #C9D3E3; padding:8px; text-align:center; font-weight:700;">Total</td>
          <td style="border:1px solid #C9D3E3; padding:8px; text-align:right; font-weight:700;">${Number(bill.totalAmount || 0).toLocaleString()}</td>
        </tr>
        <tr>
          <td style="border:1px solid #C9D3E3; padding:8px; font-weight:700; width:70px;">Rupees</td>
          <td colspan="3" style="border:1px solid #C9D3E3; padding:8px;">${escapeHtml(bill.amountInWords || "")}</td>
        </tr>
      </tbody>
    </table>

    <table style="width:auto; margin-top: 26px; margin-left:auto; border-collapse:collapse;">
      <tr>
        <td style="padding:6px 14px 6px 0; font-weight:700;">Vide Cheque No</td>
        <td style="border:1px solid #C9D3E3; padding:6px 30px;">
          ${escapeHtml(bill.chequeNo || "")}${bill.chequeDate ? `<br/>Dated. ${formatDateDMY(bill.chequeDate)}` : ""}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 14px 6px 0; font-weight:700;">Received By (Sig)</td>
        <td style="border:1px solid #C9D3E3; padding:18px 30px;"></td>
      </tr>
      <tr>
        <td style="padding:6px 14px 6px 0; font-weight:700;">Name</td>
        <td style="border:1px solid #C9D3E3; padding:6px 30px;">${escapeHtml(bill.receivedByName || "")}</td>
      </tr>
      <tr>
        <td style="padding:6px 14px 6px 0; font-weight:700;">Rank</td>
        <td style="border:1px solid #C9D3E3; padding:6px 30px;">${escapeHtml(bill.receivedByRank || "")}</td>
      </tr>
      <tr>
        <td style="padding:6px 14px 6px 0; font-weight:700;">Sign</td>
        <td style="border:1px solid #C9D3E3; padding:18px 30px;"></td>
      </tr>
    </table>

    <div style="text-align:center; margin-top:56px;">
      <div style="height:72px;"></div>
      <div style="font-weight:700; font-size:12pt; letter-spacing:0.5px;">COUNTERSIGNED</div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDateDMY(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
