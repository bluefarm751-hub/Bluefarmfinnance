export const months = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i, 1).toLocaleString("en", { month: "long" }),
}));

const currentYear = new Date().getFullYear();
export const years = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

export const currentMonth = new Date().getMonth() + 1;
export const currentYearValue = currentYear;

export function monthRange(month, year) {
  if (!month) return { fromDate: "", toDate: "" };
  const m = String(month).padStart(2, "0");
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  return {
    fromDate: `${year}-${m}-01`,
    toDate: `${year}-${m}-${String(lastDay).padStart(2, "0")}`,
  };
}
