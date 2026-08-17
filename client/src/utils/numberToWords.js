// Converts a number (Rupee amount) into words, e.g. 8970000 ->
// "Eight Million Nine Hundred Seventy Thousand" — matches the international
// grouping (Million/Thousand) used on the printed Contingent Bill voucher.

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function threeDigitsToWords(num) {
  let str = "";
  const hundreds = Math.floor(num / 100);
  const rest = num % 100;

  if (hundreds > 0) {
    str += `${ONES[hundreds]} Hundred`;
    if (rest > 0) str += " ";
  }

  if (rest > 0) {
    if (rest < 20) {
      str += ONES[rest];
    } else {
      const tens = Math.floor(rest / 10);
      const ones = rest % 10;
      str += TENS[tens];
      if (ones > 0) str += `-${ONES[ones]}`;
    }
  }

  return str;
}

// Main export — takes a number, returns "... Only" style words.
export function numberToWords(amount) {
  const num = Math.floor(Math.abs(Number(amount) || 0));
  if (num === 0) return "Zero Only";

  const units = [
    { value: 1000000000, label: "Billion" },
    { value: 1000000, label: "Million" },
    { value: 1000, label: "Thousand" },
    { value: 1, label: "" },
  ];

  let remaining = num;
  const parts = [];

  for (const unit of units) {
    const count = Math.floor(remaining / unit.value);
    if (count > 0) {
      const words = threeDigitsToWords(count);
      parts.push(unit.label ? `${words} ${unit.label}` : words);
      remaining -= count * unit.value;
    }
  }

  return `${parts.join(" ")} Only`;
}

export default numberToWords;
