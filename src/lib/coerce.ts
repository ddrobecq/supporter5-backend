import { AppError } from '../types';

/**
 * Text of a scalar value as is: '' for null / undefined, String() for string / number / bigint / boolean.
 * An object or an array is a malformed input (AppError 400), never stringified as "[object Object]".
 */
export function toRawText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') return String(value);
  throw new AppError(400, 'Valeur invalide : texte attendu (objet ou tableau reçu).');
}

/** Text of a scalar value, trimmed ('' for null / undefined, AppError 400 for an object or an array). */
export function toText(value: unknown): string {
  return toRawText(value).trim();
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

/** JSON body as an object of raw (unvalidated) fields, or AppError 400 for a missing body, an array or a scalar. */
export function requireBodyObject(body: unknown, message = 'Corps de requête invalide (objet JSON attendu).'): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError(400, message);
  return body as Record<string, unknown>;
}

/**
 * Integer sent as a number or a digit string ("12", "-3", " 7 "); NaN for anything else.
 * Unlike `Number(value)`, never accepts [3], true, "" (-> 0) or "1e2".
 */
export function parseIntStrict(value: unknown): number {
  if (typeof value === 'number') return Number.isInteger(value) ? value : Number.NaN;
  if (typeof value === 'string' && /^\s*-?\d+\s*$/.test(value)) return Number(value);
  return Number.NaN;
}

/** Strictly positive integer (number or digit string), or AppError 400 with `message`. */
export function requirePositiveInt(value: unknown, message: string): number {
  const numeric = parseIntStrict(value);
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

/** Colour as sent: "#RRGGBB" (hex digits, case kept as sent) or empty / NULL = no colour (NULL); anything else is a 400. */
export function parseHexColor(value: unknown, message: string): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') throw new AppError(400, message);
  const text = value.trim();
  if (!text) return null;
  if (!/^#[0-9A-Fa-f]{6}$/.test(text)) throw new AppError(400, message);
  return text;
}
