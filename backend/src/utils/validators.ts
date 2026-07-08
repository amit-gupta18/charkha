export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

export function oneOfValue(value: unknown, list: readonly string[]): boolean {
  return typeof value === "string" && list.includes(value);
}

// Parses a "YYYY-MM-DD" string as LOCAL midnight (not UTC),
// so stored dates align with local day/week/month boundaries.
export function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());

  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  const date = new Date(year, month, day, 0, 0, 0, 0);

  return Number.isNaN(date.getTime()) ? null : date;
}
