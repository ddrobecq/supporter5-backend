/** Text of an unknown value, trimmed ('' for null / undefined). */
export function toText(value: unknown): string {
  return String(value ?? '').trim();
}

/** Integer part of a numeric value, or `fallback` when the value is not a finite number. */
export function toInt(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.trunc(numeric);
}

/** Finite number, or `fallback`. */
export function toNum(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}
