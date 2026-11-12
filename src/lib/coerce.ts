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
