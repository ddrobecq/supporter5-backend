/** Reference to a ranked participant of a previous tour (PARTICIP.PASource "TUCLEUNIK,Groupe,Classement"). */
export interface PaSourceRef {
  tourId: number;
  groupName: string;
  rank: number;
}

const POSITIVE_DIGITS = /^\d+$/;

function positiveDigits(value: string): number | null {
  if (!POSITIVE_DIGITS.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Single PASource rule: "TUCLEUNIK,Groupe,Classement" where the tour and the rank are strictly positive
 * integers written with digits only, and the group may be empty ("123,,1"). Parts are trimmed.
 * Returns null when the value is empty or does not follow the rule.
 */
export function parsePaSource(value: unknown): PaSourceRef | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const parts = raw.split(',').map((part) => part.trim());
  if (parts.length !== 3) return null;

  const tourId = positiveDigits(parts[0]);
  const rank = positiveDigits(parts[2]);
  if (tourId === null || rank === null) return null;

  return { tourId, groupName: parts[1], rank };
}
