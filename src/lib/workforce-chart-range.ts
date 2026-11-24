export type WorkforcePeriod = "Week" | "Month" | "Quarter" | "Year";

function asUtcDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export function parseWorkforceAnchor(value: string | null | undefined) {
  return value ? asUtcDate(value) : null;
}

export function getCurrentWorkforceAnchor(period: WorkforcePeriod) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  const today = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  return normalizeWorkforceAnchor(period, today.toISOString().slice(0, 10));
}

export function normalizeWorkforceAnchor(period: WorkforcePeriod, value: string) {
  const date = asUtcDate(value) ?? new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  if (period === "Year") return new Date(Date.UTC(year, 0, 1)).toISOString().slice(0, 10);
  if (period === "Quarter") return new Date(Date.UTC(year, Math.floor(month / 3) * 3, 1)).toISOString().slice(0, 10);
  if (period === "Month") return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

export function shiftWorkforceAnchor(period: WorkforcePeriod, value: string, amount: number) {
  const date = parseWorkforceAnchor(value) ?? parseWorkforceAnchor(getCurrentWorkforceAnchor(period))!;
  if (period === "Year") date.setUTCFullYear(date.getUTCFullYear() + amount);
  else if (period === "Quarter") date.setUTCMonth(date.getUTCMonth() + amount * 3);
  else if (period === "Month") date.setUTCMonth(date.getUTCMonth() + amount);
  else date.setUTCDate(date.getUTCDate() + amount * 7);
  return normalizeWorkforceAnchor(period, date.toISOString().slice(0, 10));
}

export function formatWorkforceAnchorLabel(period: WorkforcePeriod, value: string) {
  const date = parseWorkforceAnchor(value) ?? parseWorkforceAnchor(getCurrentWorkforceAnchor(period))!;
  const year = date.getUTCFullYear();
  if (period === "Year") return String(year);
  if (period === "Quarter") return `Quarter ${Math.floor(date.getUTCMonth() / 3) + 1}, ${year}`;
  if (period === "Month") return date.toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "UTC" });
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 6);
  const startLabel = date.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
  if (end.getUTCFullYear() !== year) {
    const fullStart = date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    const fullEnd = end.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    return `${fullStart}–${fullEnd}`;
  }
  const endLabel = end.toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${startLabel}–${endLabel}, ${year}`;
}
