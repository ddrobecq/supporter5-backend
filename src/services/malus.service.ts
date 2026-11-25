import { dbAll, dbGet, dbRun } from '../config/database';
import { parseIntStrict, requireBodyObject, requireMaxLength, requirePositiveInt } from '../lib/coerce';
import { normalizeDayDate } from '../lib/dates';
import { AppError } from '../types';

/** MALUS = points retires a un participant (PARTICIP) d'un tour de type Ligue. */
export interface MalusRow {
  MLCLEUNIK: number;
  PACLEUNIK: number;
  TUCLEUNIK: number;
  IDCLUB: string;
  CLUB: string;
  GROUPE: string;
  PASource: string;
  MLPoints: number;
  /** null = pas de motif. */
  MLMotif: string | null;
  /** 'YYYY-MM-DD', or '' when unknown. */
  MLDate: string;
}

/** Malus attached to a participant row of getTourParticipants. */
export interface ParticipantMalus {
  MLCLEUNIK: number;
  MLPoints: number;
  MLMotif: string | null;
  MLDate: string;
}

export interface MalusInput {
  PACLEUNIK: number;
  MLPoints: number;
  MLMotif: string | null;
  MLDate: string;
}

/** TOURDEF.TDTYPETOUR of a league tour (same default as the standings computation in rencontres.service). */
const LEAGUE_TOUR_TYPE = 1;
const MOTIF_MAX_LENGTH = 100;

const MALUS_SELECT = `
  SELECT
    m."MLCLEUNIK" AS "MLCLEUNIK",
    m."PACLEUNIK" AS "PACLEUNIK",
    p."TUCLEUNIK" AS "TUCLEUNIK",
    COALESCE(p."IDCLUB", '') AS "IDCLUB",
    COALESCE(c."CLUB", '') AS "CLUB",
    COALESCE(p."GROUPE", '') AS "GROUPE",
    COALESCE(p."PASource", '') AS "PASource",
    m."MLPoints" AS "MLPoints",
    m."MLMotif" AS "MLMotif",
    m."MLDate" AS "MLDate"
  FROM "MALUS" m
  JOIN "PARTICIP" p ON p."PACLEUNIK" = m."PACLEUNIK"
  LEFT JOIN "CLUB" c ON c."IDCLUB" = p."IDCLUB"`;

function mapMalusRow(row: MalusRow): MalusRow {
  return {
    MLCLEUNIK: Number(row.MLCLEUNIK),
    PACLEUNIK: Number(row.PACLEUNIK),
    TUCLEUNIK: Number(row.TUCLEUNIK),
    IDCLUB: String(row.IDCLUB ?? '').trim(),
    CLUB: String(row.CLUB ?? '').trim(),
    GROUPE: String(row.GROUPE ?? '').trim(),
    PASource: String(row.PASource ?? '').trim(),
    MLPoints: Number(row.MLPoints),
    MLMotif: row.MLMotif === null ? null : String(row.MLMotif),
    MLDate: String(row.MLDate ?? ''),
  };
}

function normalizeTourId(value: string | number): number {
  return requirePositiveInt(value, 'Identifiant de tour invalide.');
}

function normalizeMalusId(value: string | number): number {
  return requirePositiveInt(value, 'Identifiant de malus invalide.');
}

/** MLPoints: integer (number or digit string), 400 otherwise; <= 0 is a business rule (422). */
function parseMalusPoints(value: unknown): number {
  const points = parseIntStrict(value);
  if (!Number.isSafeInteger(points)) {
    throw new AppError(400, 'Nombre de points du malus invalide (entier attendu).');
  }
  if (points <= 0) {
    throw new AppError(422, 'Un malus retire au moins 1 point.');
  }
  return points;
}

/** MLMotif: null (no motif) or a non-blank string of at most 100 characters, stored as sent. */
function parseMalusMotif(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(400, 'Motif du malus invalide (texte non vide ou null attendu).');
  }
  return requireMaxLength(value, MOTIF_MAX_LENGTH, 'Motif du malus');
}

/** MLDate: '' (unknown) or a strict ISO 'YYYY-MM-DD' date, stored as sent (no trimming). */
function parseMalusDate(value: unknown): string {
  if (typeof value !== 'string') {
    throw new AppError(400, 'La date du malus est invalide.');
  }
  if (value === '') return '';
  const normalized = normalizeDayDate(value, { field: 'du malus' });
  if (normalized !== value) {
    throw new AppError(400, 'La date du malus est invalide.');
  }
  return normalized;
}

/**
 * Validates a malus body. With `partial` (POST), MLMotif and MLDate may be absent (null and '');
 * otherwise (PUT) every field is required.
 */
export function parseMalusInput(body: unknown, partial: boolean): MalusInput {
  const raw = requireBodyObject(body);
  if (!partial && (raw.MLMotif === undefined || raw.MLDate === undefined)) {
    throw new AppError(400, 'MLMotif et MLDate sont requis.');
  }
  return {
    PACLEUNIK: requirePositiveInt(raw.PACLEUNIK, 'Identifiant de participant invalide.'),
    MLPoints: parseMalusPoints(raw.MLPoints),
    MLMotif: raw.MLMotif === undefined ? null : parseMalusMotif(raw.MLMotif),
    MLDate: raw.MLDate === undefined ? '' : parseMalusDate(raw.MLDate),
  };
}

async function readTour(tourId: number): Promise<{ NOM: string; TYPE_ID: number }> {
  const tour = await dbGet<{ NOM: string | null; TYPE_ID: number | null }>(
    `SELECT t."NOM" AS "NOM", COALESCE(td."TDTYPETOUR", ${LEAGUE_TOUR_TYPE}) AS "TYPE_ID"
     FROM "TOUR" t
     LEFT JOIN "TOURDEF" td ON td."TDCLEUNIK" = t."TDCLEUNIK"
     WHERE t."TUCLEUNIK" = ?`,
    [tourId],
  );
  if (!tour) {
    throw new AppError(404, 'Tour introuvable.');
  }
  return { NOM: String(tour.NOM ?? '').trim(), TYPE_ID: Number(tour.TYPE_ID) };
}

async function assertLeagueTour(tourId: number): Promise<void> {
  const tour = await readTour(tourId);
  if (tour.TYPE_ID !== LEAGUE_TOUR_TYPE) {
    throw new AppError(422, `Le tour « ${tour.NOM} » n'est pas une ligue : aucun malus ne peut y être enregistré.`);
  }
}

async function assertParticipantInTour(tourId: number, participantId: number): Promise<void> {
  const row = await dbGet<{ PACLEUNIK: number }>(
    'SELECT "PACLEUNIK" FROM "PARTICIP" WHERE "PACLEUNIK" = ? AND "TUCLEUNIK" = ?',
    [participantId, tourId],
  );
  if (!row) {
    throw new AppError(404, 'Participant introuvable dans ce tour.');
  }
}

async function readMalusOfTour(tourId: number, malusId: number): Promise<MalusRow | undefined> {
  const row = await dbGet<MalusRow>(`${MALUS_SELECT} WHERE m."MLCLEUNIK" = ? AND p."TUCLEUNIK" = ?`, [malusId, tourId]);
  return row ? mapMalusRow(row) : undefined;
}

async function getMalusOfTour(tourIdInput: string | number): Promise<MalusRow[]> {
  const tourId = normalizeTourId(tourIdInput);
  await readTour(tourId);
  const rows = await dbAll<MalusRow>(
    `${MALUS_SELECT}
     WHERE p."TUCLEUNIK" = ?
     ORDER BY m."MLDate" ASC, COALESCE(c."CLUB", '') ASC, m."MLCLEUNIK" ASC`,
    [tourId],
  );
  return rows.map(mapMalusRow);
}

/** Malus of every participant of a tour, grouped by PACLEUNIK (single query, for getTourParticipants). */
export async function getMalusByParticipant(tourId: number): Promise<Map<number, ParticipantMalus[]>> {
  const rows = await dbAll<{ PACLEUNIK: number } & ParticipantMalus>(
    `SELECT m."MLCLEUNIK", m."PACLEUNIK", m."MLPoints", m."MLMotif", m."MLDate"
     FROM "MALUS" m
     JOIN "PARTICIP" p ON p."PACLEUNIK" = m."PACLEUNIK"
     WHERE p."TUCLEUNIK" = ?
     ORDER BY m."MLDate" ASC, m."MLCLEUNIK" ASC`,
    [tourId],
  );
  const byParticipant = new Map<number, ParticipantMalus[]>();
  rows.forEach((row) => {
    const participantId = Number(row.PACLEUNIK);
    const bucket = byParticipant.get(participantId) ?? [];
    bucket.push({
      MLCLEUNIK: Number(row.MLCLEUNIK),
      MLPoints: Number(row.MLPoints),
      MLMotif: row.MLMotif === null ? null : String(row.MLMotif),
      MLDate: String(row.MLDate ?? ''),
    });
    byParticipant.set(participantId, bucket);
  });
  return byParticipant;
}

async function createMalus(tourIdInput: string | number, body: unknown): Promise<MalusRow> {
  const tourId = normalizeTourId(tourIdInput);
  const input = parseMalusInput(body, true);
  await assertLeagueTour(tourId);
  await assertParticipantInTour(tourId, input.PACLEUNIK);

  const result = await dbRun(
    'INSERT INTO "MALUS" ("PACLEUNIK", "MLPoints", "MLMotif", "MLDate") VALUES (?, ?, ?, ?)',
    [input.PACLEUNIK, input.MLPoints, input.MLMotif, input.MLDate],
  );
  const created = await readMalusOfTour(tourId, Number(result.lastInsertRowid));
  if (!created) {
    throw new AppError(500, 'Impossible de relire le malus créé.');
  }
  return created;
}

async function updateMalus(tourIdInput: string | number, malusIdInput: string | number, body: unknown): Promise<MalusRow> {
  const tourId = normalizeTourId(tourIdInput);
  const malusId = normalizeMalusId(malusIdInput);
  const input = parseMalusInput(body, false);
  await assertLeagueTour(tourId);
  if (!(await readMalusOfTour(tourId, malusId))) {
    throw new AppError(404, 'Malus introuvable dans ce tour.');
  }
  await assertParticipantInTour(tourId, input.PACLEUNIK);

  await dbRun(
    'UPDATE "MALUS" SET "PACLEUNIK" = ?, "MLPoints" = ?, "MLMotif" = ?, "MLDate" = ? WHERE "MLCLEUNIK" = ?',
    [input.PACLEUNIK, input.MLPoints, input.MLMotif, input.MLDate, malusId],
  );
  const updated = await readMalusOfTour(tourId, malusId);
  if (!updated) {
    throw new AppError(500, 'Impossible de relire le malus modifié.');
  }
  return updated;
}

/** false when the tour has no such malus (404). */
async function removeMalus(tourIdInput: string | number, malusIdInput: string | number): Promise<boolean> {
  const tourId = normalizeTourId(tourIdInput);
  const malusId = normalizeMalusId(malusIdInput);
  const result = await dbRun(
    `DELETE FROM "MALUS"
     WHERE "MLCLEUNIK" = ?
       AND "PACLEUNIK" IN (SELECT "PACLEUNIK" FROM "PARTICIP" WHERE "TUCLEUNIK" = ?)`,
    [malusId, tourId],
  );
  return result.changes > 0;
}

export default {
  getMalusOfTour,
  createMalus,
  updateMalus,
  removeMalus,
};
