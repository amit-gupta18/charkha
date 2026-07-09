export const inr = (n: number, decimals = 0) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals > 0 ? decimals : 0 })}`;

export const today = () => new Date().toISOString().slice(0, 10);

export const monthStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export function isoWeekKey(dateStr: string) {
  const d = new Date(dateStr);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
    );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
