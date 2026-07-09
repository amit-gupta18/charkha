/** Calendar date stored as UTC midnight with local Y-M-D components (see parseLocalDate + income/expense POST). */
export function calendarDateUTC(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d));
}

export function startOfMonthFromDate(d: Date): Date {
  return calendarDateUTC(d.getFullYear(), d.getMonth(), 1);
}

export function startOfNextMonthFromDate(d: Date): Date {
  return calendarDateUTC(d.getFullYear(), d.getMonth() + 1, 1);
}

export function startOfDayFromDate(d: Date): Date {
  return calendarDateUTC(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfWeekMondayFromDate(d: Date): Date {
  const start = startOfDayFromDate(d);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setUTCDate(start.getUTCDate() + diff);
  return start;
}

export function addDaysUTC(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
