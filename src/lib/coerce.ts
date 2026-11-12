import { AppError } from '../types';

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

/** Strictly positive integer (`Number(value)`), or AppError 400 with `message`. */
export function requirePositiveInt(value: unknown, message: string): number {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) throw new AppError(400, message);
  return numeric;
}

/** Non-empty trimmed text, or AppError 400 with `message`. */
export function requireText(value: unknown, message: string): string {
  const text = toText(value);
  if (!text) throw new AppError(400, message);
  return text;
}

/** 0/1 business flag: accepts 0, 1, "0", "1", true and false; any other value is a 400 (never coerced by truthiness). */
export function parseFlag(value: unknown, field: string): 0 | 1 {
  const raw = typeof value === 'string' ? value.trim() : value;
  if (raw === true || raw === 1 || raw === '1') return 1;
  if (raw === false || raw === 0 || raw === '0') return 0;
  throw new AppError(400, `${field} invalide (0 ou 1 attendu).`);
}

/** Text stored as sent: a value longer than `max` is a 400, never truncated. */
export function requireMaxLength(text: string, max: number, label: string): string {
  if (text.length > max) throw new AppError(400, `${label} trop long (${max} caractères maximum).`);
  return text;
}

/** Code used as a join key (IDNATIO, IDCIRC...): stored as sent, so it must already be in upper case. */
export function requireUpperCaseCode(code: string, message: string): string {
  if (code !== code.toUpperCase()) throw new AppError(400, message);
  return code;
}
