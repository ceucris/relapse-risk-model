export function toDayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDayKey(dayKey: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** Monday-based week key = Monday's YYYY-MM-DD */
export function getWeekKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toDayKey(d);
}

export function shiftWeek(weekKey: string, delta: number): string {
  const d = parseDayKey(weekKey);
  d.setDate(d.getDate() + delta * 7);
  return getWeekKey(d);
}

export function getWeekDays(weekKey: string): string[] {
  const start = parseDayKey(weekKey);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return toDayKey(d);
  });
}

export function formatWeekLabel(weekKey: string): string {
  const days = getWeekDays(weekKey);
  const start = parseDayKey(days[0]);
  const end = parseDayKey(days[6]);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const year =
    start.getFullYear() === end.getFullYear()
      ? `, ${start.getFullYear()}`
      : ` ${start.getFullYear()} – ${end.getFullYear()}`;
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}${year}`;
}

export function getQuarterKey(date: Date = new Date()): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `${date.getFullYear()}-Q${q}`;
}

export function shiftQuarter(quarterKey: string, delta: number): string {
  const match = quarterKey.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return getQuarterKey();
  let year = Number(match[1]);
  let q = Number(match[2]) + delta;
  while (q < 1) {
    q += 4;
    year -= 1;
  }
  while (q > 4) {
    q -= 4;
    year += 1;
  }
  return `${year}-Q${q}`;
}

export function getYearKey(date: Date = new Date()): string {
  return String(date.getFullYear());
}

export function dayLabel(dayKey: string, style: "short" | "long" = "short") {
  const d = parseDayKey(dayKey);
  return d.toLocaleDateString(undefined, {
    weekday: style,
    month: style === "long" ? "long" : undefined,
    day: style === "long" ? "numeric" : undefined,
  });
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}
