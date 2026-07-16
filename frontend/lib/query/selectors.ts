import type { Settings } from "@/lib/types";

/** Safe select for `{ settings: Settings }` — handles null API data and avoid double-select with keepPreviousData. */
export function selectSettings(data: { settings: Settings | null } | Settings | null | undefined): Settings | null {
  if (data == null) return null;
  if ("settings" in data) return data.settings ?? null;
  if ("weeklyLimit" in data) return data as Settings;
  return null;
}

/** Safe select for list wrapper responses like `{ expenses: T[] }`. */
export function selectListField<T, K extends string>(field: K, fallback: T[] = []) {
  return (data: Record<K, T[]> | T[] | null | undefined): T[] => {
    if (data == null) return fallback;
    if (Array.isArray(data)) return data;
    const list = data[field];
    return Array.isArray(list) ? list : fallback;
  };
}

/** Safe select for single-item wrapper responses like `{ note: T }`. */
export function selectItemField<T, K extends string>(field: K) {
  return (data: Record<K, T> | T | null | undefined): T | undefined => {
    if (data == null) return undefined;
    if (typeof data === "object" && field in data) return (data as Record<K, T>)[field];
    return data as T;
  };
}
