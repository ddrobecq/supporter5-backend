import { AppError } from '../types';

/**
 * Day-precision date columns (stored as TEXT "YYYY-MM-DD", '' when unknown).
 * Timestamps and time columns are intentionally excluded.
 */
export const DAY_DATE_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  BLESSURE: ['DATE'],
  CLUB_NOM: ['DATE'],
  CLUB_TERRAIN: ['DATE'],
  JOUEURRG: ['NAISSANCE', 'DECES'],
  RENCO: ['DATE'],
  SAISON: ['SA_DEBUT', 'SA_FIN'],
  TOUR: ['DATE_DEBUT', 'DATE_FIN', 'TU_DATETIRAGE'],
  TRANSAC: ['DATE', 'TN_ECHEANCE'],
};

const MIN_YEAR = 1800;

interface DayDateParts {
  year: number;
  month: number;
  day: number;
}

export interface NormalizeDayDateOptions {
  /** When true, an empty value is rejected instead of being stored as ''. */
  required?: boolean;
  /** Complement inserted in the error message, e.g. "de naissance" -> "La date de naissance est invalide." */
  field?: string;
}

/**
 * Single parsing point for day dates. Only strict ISO "YYYY-MM-DD" is accepted.
 * Returns null when the text is not a real calendar date.
 */
function parseDayDate(text: string): DayDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

function formatDayDate({ year, month, day }: DayDateParts): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dateLabel(field: string | undefined): string {
  const complement = field?.trim();
  return complement ? `La date ${complement}` : 'La date';
}

/**
 * Normalizes a day date to "YYYY-MM-DD", or '' when empty (undefined, null, blank string).
 * Throws AppError(400) for non-string values, non-ISO formats, impossible dates,
 * years below 1800, or an empty value when `required` is set.
 */
export function normalizeDayDate(value: unknown, options: NormalizeDayDateOptions = {}): string {
  const label = dateLabel(options.field);

  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new AppError(400, `${label} est invalide.`);
  }

  const text = (value ?? '').trim();
  if (!text) {
    if (options.required) {
      throw new AppError(400, `${label} est requise.`);
    }
    return '';
  }

  const parts = parseDayDate(text);
  if (!parts || parts.year < MIN_YEAR) {
    throw new AppError(400, `${label} est invalide.`);
  }

  return formatDayDate(parts);
}

/**
 * Returns a copy of `body` where every present day-date column of `table` is normalized.
 * Column and table names are matched case-insensitively; absent keys are left absent.
 * Unknown tables return an unchanged copy. The original body is never mutated.
 */
export function normalizeDayDateFields(table: string, body: Record<string, unknown>): Record<string, unknown> {
  const tableKey = Object.keys(DAY_DATE_COLUMNS).find((name) => name.toUpperCase() === table.toUpperCase());
  const result: Record<string, unknown> = { ...body };
  if (!tableKey) {
    return result;
  }

  const dateColumns = new Set(DAY_DATE_COLUMNS[tableKey].map((col) => col.toUpperCase()));
  for (const key of Object.keys(result)) {
    if (dateColumns.has(key.toUpperCase())) {
      result[key] = normalizeDayDate(result[key], { field: `(${key})` });
    }
  }

  return result;
}
