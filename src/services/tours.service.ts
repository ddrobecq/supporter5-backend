import db, { dbAll, dbGet, dbRun } from '../config/database';
import { AppError } from '../types';
import { createEntityService } from '../lib/baseService';

export interface CompetitionTourGridRow {
  TUCLEUNIK: number;
  COCLEUNIK: number;
  TDCLEUNIK: number;
  TU_ORDRE: number;
  TOUR: string;
  TYPE_ID: number;
  TYPE: string;
}

export interface TourParticipantRow {
  PACLEUNIK: number;
  TUCLEUNIK: number;
  IDCLUB: string;
  CLUB: string;
  GROUPE: string;
}

export interface TourRencontreRow {
  RECLEUNIK: number;
  DATE: string;
  HEURE: string;
  DOMICILE: string;
  EXTERIEUR: string;
  IDCIRC: string | null;
  ETAT: number;
  TUCLEUNIK: number;
  SAISON: string;
  READMIN: number;
  COMMENT: string | null;
  VID_ID: number | null;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  PADOMSource: string;
  PAEXTSource: string;
}

/** TOUR = tours / phases de compétition */
const baseService = createEntityService({
  table:           'TOUR',
  pk:              'TUCLEUNIK',
  selectCols:      [
    'TDCLEUNIK',
    'TUCLEUNIK',
    'NB_PARTICIPANTS',
    'COCLEUNIK',
    'NOM',
    'DATE_DEBUT',
    'DATE_FIN',
    'TUHEURE',
    'NB_EQUIPE',
    'NB_GROUPE',
    'TU_ORDRE',
    'TU_FINAL',
    'TU_DATETIRAGE',
    'TU_HEURETIRAGE',
    'TU_SELECTION',
    'TU_COMMENT',
    'NB_MATCH',
  ],
  allowedSortCols: ['TUCLEUNIK', 'TDCLEUNIK', 'DATE_DEBUT', 'TU_ORDRE', 'NOM'],
  searchCols:      ['NOM', 'TU_COMMENT'],
  filterCols:      ['TUCLEUNIK', 'COCLEUNIK'],
});

function normalizeTourId(value: string | number): number {
  const numericId = Number(value);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new AppError(400, 'Identifiant de tour invalide.');
  }
  return numericId;
}

function normalizeCompetitionId(value: string | number): number {
  const numericId = Number(value);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new AppError(400, 'Identifiant de competition invalide.');
  }
  return numericId;
}

function mapTourType(typeId: number): string {
  if (Number(typeId) === 1) return 'Ligue';
  if (Number(typeId) === 2) return 'Eliminatoire';
  return `Type ${Number(typeId)}`;
}

async function resolveTourDefKeyFromType(typeId: number): Promise<number> {
  const normalizedType = Number(typeId);
  if (![1, 2].includes(normalizedType)) {
    throw new AppError(400, 'Type de tour invalide.');
  }

  const row = await dbGet<{ TDCLEUNIK: number }>(
    'SELECT "TDCLEUNIK" FROM "TOURDEF" WHERE "TDTYPETOUR" = ? ORDER BY "TDCLEUNIK" ASC LIMIT 1',
    [normalizedType],
  );

  if (!row?.TDCLEUNIK) {
    throw new AppError(400, 'Aucun TOURDEF disponible pour ce type de tour.');
  }

  return Number(row.TDCLEUNIK);
}

async function normalizeTourPayload(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const normalized = { ...body };
  const maybeTourDefKey = Number(normalized.TDCLEUNIK);

  // Frontend can send 1/2 as logical type markers; resolve them to a real TOURDEF key.
  if (Number.isInteger(maybeTourDefKey) && [1, 2].includes(maybeTourDefKey)) {
    normalized.TDCLEUNIK = await resolveTourDefKeyFromType(maybeTourDefKey);
  }

  return normalized;
}

async function getTourByIdDetailed(tourId: string | number): Promise<Record<string, unknown> | undefined> {
  const id = normalizeTourId(tourId);
  return dbGet<Record<string, unknown>>(
    `SELECT
       t."TDCLEUNIK",
       t."TUCLEUNIK",
       t."NB_PARTICIPANTS",
       t."COCLEUNIK",
       t."NOM",
       t."DATE_DEBUT",
       t."DATE_FIN",
       t."TUHEURE",
       t."NB_EQUIPE",
       t."NB_GROUPE",
       t."TU_ORDRE",
       t."TU_FINAL",
       t."TU_DATETIRAGE",
       t."TU_HEURETIRAGE",
       t."TU_SELECTION",
       t."TU_COMMENT",
       t."NB_MATCH",
       td."TDTYPETOUR" AS "TDTYPETOUR"
     FROM "TOUR" t
     LEFT JOIN "TOURDEF" td ON td."TDCLEUNIK" = t."TDCLEUNIK"
     WHERE t."TUCLEUNIK" = ?`,
    [id],
  );
}

async function getToursByCompetition(competitionId: string | number): Promise<CompetitionTourGridRow[]> {
  const id = normalizeCompetitionId(competitionId);
  const rows = await dbAll<{
    TUCLEUNIK: number;
    COCLEUNIK: number;
    TDCLEUNIK: number;
    TU_ORDRE: number;
    TOUR: string;
    TYPE_ID: number | null;
  }>(
    `SELECT
       t."TUCLEUNIK" AS "TUCLEUNIK",
       t."COCLEUNIK" AS "COCLEUNIK",
       t."TDCLEUNIK" AS "TDCLEUNIK",
       t."TU_ORDRE" AS "TU_ORDRE",
       t."NOM" AS "TOUR",
       td."TDTYPETOUR" AS "TYPE_ID"
     FROM "TOUR" t
     LEFT JOIN "TOURDEF" td ON td."TDCLEUNIK" = t."TDCLEUNIK"
     WHERE t."COCLEUNIK" = ?
     ORDER BY t."TU_ORDRE" ASC, t."TUCLEUNIK" ASC`,
    [id],
  );

  return rows.map((row) => {
    const typeId = Number(row.TYPE_ID ?? 0);
    return {
      TUCLEUNIK: Number(row.TUCLEUNIK),
      COCLEUNIK: Number(row.COCLEUNIK),
      TDCLEUNIK: Number(row.TDCLEUNIK),
      TU_ORDRE: Number(row.TU_ORDRE),
      TOUR: String(row.TOUR ?? ''),
      TYPE_ID: typeId,
      TYPE: mapTourType(typeId),
    };
  });
}

async function resequenceCompetitionTours(competitionId: number, orderedTourIds: number[]): Promise<void> {
  if (orderedTourIds.length === 0) {
    return;
  }

  const transaction = db.transaction((ids: number[]) => {
    ids.forEach((tourId, index) => {
      db.prepare('UPDATE "TOUR" SET "TU_ORDRE" = ? WHERE "TUCLEUNIK" = ? AND "COCLEUNIK" = ?')
        .run(index + 1, tourId, competitionId);
    });
  });

  transaction(orderedTourIds);
}

async function moveTour(tourId: string | number, direction: 'up' | 'down'): Promise<CompetitionTourGridRow[]> {
  const normalizedTourId = normalizeTourId(tourId);
  const selectedRow = await dbGet<{ TUCLEUNIK: number; COCLEUNIK: number }>(
    'SELECT "TUCLEUNIK", "COCLEUNIK" FROM "TOUR" WHERE "TUCLEUNIK" = ?',
    [normalizedTourId],
  );

  if (!selectedRow) {
    throw new AppError(404, 'Tour introuvable.');
  }

  const competitionId = Number(selectedRow.COCLEUNIK);
  const rows = await getToursByCompetition(competitionId);
  const selectedIndex = rows.findIndex((row) => Number(row.TUCLEUNIK) === normalizedTourId);
  if (selectedIndex < 0) {
    throw new AppError(404, 'Tour introuvable.');
  }

  const targetIndex = direction === 'up' ? selectedIndex - 1 : selectedIndex + 1;
  if (targetIndex < 0 || targetIndex >= rows.length) {
    return rows;
  }

  const reordered = [...rows];
  const [selected] = reordered.splice(selectedIndex, 1);
  reordered.splice(targetIndex, 0, selected);
  await resequenceCompetitionTours(
    competitionId,
    reordered.map((row) => Number(row.TUCLEUNIK)),
  );

  return getToursByCompetition(competitionId);
}

async function removeTourWithResequence(tourId: string | number): Promise<boolean> {
  const normalizedTourId = normalizeTourId(tourId);
  const selectedRow = await dbGet<{ COCLEUNIK: number }>(
    'SELECT "COCLEUNIK" FROM "TOUR" WHERE "TUCLEUNIK" = ?',
    [normalizedTourId],
  );

  if (!selectedRow) {
    return false;
  }

  const competitionId = Number(selectedRow.COCLEUNIK);
  const removed = (await dbRun('DELETE FROM "TOUR" WHERE "TUCLEUNIK" = ?', [normalizedTourId])).changes > 0;
  if (!removed) {
    return false;
  }

  const remaining = await getToursByCompetition(competitionId);
  await resequenceCompetitionTours(
    competitionId,
    remaining.map((row) => Number(row.TUCLEUNIK)),
  );
  return true;
}

async function getTourParticipants(tourId: string | number): Promise<TourParticipantRow[]> {
  const id = normalizeTourId(tourId);
  const rows = await dbAll<TourParticipantRow>(
    `SELECT
       p."PACLEUNIK" AS "PACLEUNIK",
       p."TUCLEUNIK" AS "TUCLEUNIK",
       p."IDCLUB" AS "IDCLUB",
       c."CLUB" AS "CLUB",
       COALESCE(p."GROUPE", '') AS "GROUPE"
     FROM "PARTICIP" p
     LEFT JOIN "CLUB" c ON c."IDCLUB" = p."IDCLUB"
     WHERE p."TUCLEUNIK" = ?
     ORDER BY c."CLUB" ASC, p."IDCLUB" ASC`,
    [id],
  );

  return rows.map((row) => ({
    PACLEUNIK: Number(row.PACLEUNIK),
    TUCLEUNIK: Number(row.TUCLEUNIK),
    IDCLUB: String(row.IDCLUB ?? '').trim(),
    CLUB: String(row.CLUB ?? '').trim(),
    GROUPE: String(row.GROUPE ?? '').trim(),
  }));
}

async function addTourParticipant(tourId: string | number, clubIdInput: string, groupeInput = ''): Promise<TourParticipantRow> {
  const tourIdValue = normalizeTourId(tourId);
  const clubId = String(clubIdInput ?? '').trim();
  const groupe = String(groupeInput ?? '').trim();

  if (!clubId) {
    throw new AppError(400, 'Identifiant de club invalide.');
  }
  if (groupe.length > 20) {
    throw new AppError(400, 'Nom de groupe invalide (20 caracteres max).');
  }

  const clubExists = await dbGet<{ IDCLUB: string }>('SELECT "IDCLUB" FROM "CLUB" WHERE "IDCLUB" = ?', [clubId]);
  if (!clubExists) {
    throw new AppError(404, 'Club introuvable.');
  }

  const existing = await dbGet<TourParticipantRow>(
    `SELECT
       p."PACLEUNIK" AS "PACLEUNIK",
       p."TUCLEUNIK" AS "TUCLEUNIK",
       p."IDCLUB" AS "IDCLUB",
       c."CLUB" AS "CLUB",
       COALESCE(p."GROUPE", '') AS "GROUPE"
     FROM "PARTICIP" p
     LEFT JOIN "CLUB" c ON c."IDCLUB" = p."IDCLUB"
     WHERE p."TUCLEUNIK" = ? AND p."IDCLUB" = ?`,
    [tourIdValue, clubId],
  );

  if (existing) {
    const existingGroupe = String(existing.GROUPE ?? '').trim();
    if (groupe !== existingGroupe) {
      await dbRun(
        `UPDATE "PARTICIP"
         SET "GROUPE" = ?
         WHERE "TUCLEUNIK" = ? AND "IDCLUB" = ?`,
        [groupe, tourIdValue, clubId],
      );
    }

    const updated = await dbGet<TourParticipantRow>(
      `SELECT
         p."PACLEUNIK" AS "PACLEUNIK",
         p."TUCLEUNIK" AS "TUCLEUNIK",
         p."IDCLUB" AS "IDCLUB",
         c."CLUB" AS "CLUB",
         COALESCE(p."GROUPE", '') AS "GROUPE"
       FROM "PARTICIP" p
       LEFT JOIN "CLUB" c ON c."IDCLUB" = p."IDCLUB"
       WHERE p."TUCLEUNIK" = ? AND p."IDCLUB" = ?`,
      [tourIdValue, clubId],
    );

    return {
      PACLEUNIK: Number(updated?.PACLEUNIK ?? existing.PACLEUNIK),
      TUCLEUNIK: Number(updated?.TUCLEUNIK ?? existing.TUCLEUNIK),
      IDCLUB: String(updated?.IDCLUB ?? existing.IDCLUB ?? '').trim(),
      CLUB: String(updated?.CLUB ?? existing.CLUB ?? '').trim(),
      GROUPE: String(updated?.GROUPE ?? existing.GROUPE ?? '').trim(),
    };
  }

  await dbRun(
    `INSERT INTO "PARTICIP" (
      "IDCLUB",
      "TUCLEUNIK",
      "GROUPE",
      "PAClassement",
      "PANbMatch",
      "PANbPoints",
      "PANbVD",
      "PANbVE",
      "PANbND",
      "PANbNE",
      "PANbDD",
      "PANbDE",
      "PANbBPD",
      "PANbBCD",
      "PABonus",
      "PANbBPE",
      "PANbBCE",
      "PADiff",
      "PANbBP",
      "PANbV",
      "PANbTaBP",
      "PANbTaBC",
      "PADiffTaB",
      "PANbBC",
      "PASource",
      "PARatio",
      "PAMalus"
    ) VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '', 0, 0)`,
    [clubId, tourIdValue, groupe],
  );

  const inserted = await dbGet<TourParticipantRow>(
    `SELECT
       p."PACLEUNIK" AS "PACLEUNIK",
       p."TUCLEUNIK" AS "TUCLEUNIK",
       p."IDCLUB" AS "IDCLUB",
       c."CLUB" AS "CLUB",
       COALESCE(p."GROUPE", '') AS "GROUPE"
     FROM "PARTICIP" p
     LEFT JOIN "CLUB" c ON c."IDCLUB" = p."IDCLUB"
     WHERE p."TUCLEUNIK" = ? AND p."IDCLUB" = ?`,
    [tourIdValue, clubId],
  );

  if (!inserted) {
    throw new AppError(500, 'Impossible d\'ajouter le participant.');
  }

  return {
    PACLEUNIK: Number(inserted.PACLEUNIK),
    TUCLEUNIK: Number(inserted.TUCLEUNIK),
    IDCLUB: String(inserted.IDCLUB ?? '').trim(),
    CLUB: String(inserted.CLUB ?? '').trim(),
    GROUPE: String(inserted.GROUPE ?? '').trim(),
  };
}

async function removeTourParticipants(tourId: string | number, clubIds: string[]): Promise<number> {
  const tourIdValue = normalizeTourId(tourId);
  const normalizedClubIds = clubIds
    .map((clubId) => String(clubId ?? '').trim())
    .filter((clubId) => clubId.length > 0);

  if (normalizedClubIds.length === 0) {
    return 0;
  }

  const placeholders = normalizedClubIds.map(() => '?').join(', ');
  const result = await dbRun(
    `DELETE FROM "PARTICIP"
     WHERE "TUCLEUNIK" = ?
       AND "IDCLUB" IN (${placeholders})`,
    [tourIdValue, ...normalizedClubIds],
  );

  return Number(result.changes ?? 0);
}

async function getTourRencontres(tourId: string | number): Promise<TourRencontreRow[]> {
  const id = normalizeTourId(tourId);
  const rows = await dbAll<TourRencontreRow>(
    `SELECT
       "RECLEUNIK",
       "DATE",
       "HEURE",
       "DOMICILE",
       "EXTERIEUR",
       "IDCIRC",
       "ETAT",
       "TUCLEUNIK",
       "SAISON",
       "READMIN",
       "COMMENT",
       "VID_ID",
       "BUTDOM",
       "BUTEXT",
       "TABDOM",
       "TABEXT",
       "PADOMSource",
       "PAEXTSource"
     FROM "RENCO"
     WHERE "TUCLEUNIK" = ?
     ORDER BY "RECLEUNIK" ASC`,
    [id],
  );

  return rows.map((row) => ({
    RECLEUNIK: Number(row.RECLEUNIK),
    DATE: String(row.DATE ?? ''),
    HEURE: String(row.HEURE ?? ''),
    DOMICILE: String(row.DOMICILE ?? '').trim(),
    EXTERIEUR: String(row.EXTERIEUR ?? '').trim(),
    IDCIRC: row.IDCIRC === null ? null : String(row.IDCIRC ?? '').trim(),
    ETAT: Number(row.ETAT ?? 1) || 1,
    TUCLEUNIK: Number(row.TUCLEUNIK),
    SAISON: String(row.SAISON ?? '').trim(),
    READMIN: Number(row.READMIN ?? 0) || 0,
    COMMENT: row.COMMENT === null ? null : String(row.COMMENT ?? ''),
    VID_ID: row.VID_ID === null ? null : Number(row.VID_ID),
    BUTDOM: Number(row.BUTDOM ?? 0) || 0,
    BUTEXT: Number(row.BUTEXT ?? 0) || 0,
    TABDOM: Number(row.TABDOM ?? 0) || 0,
    TABEXT: Number(row.TABEXT ?? 0) || 0,
    PADOMSource: String(row.PADOMSource ?? ''),
    PAEXTSource: String(row.PAEXTSource ?? ''),
  }));
}

export default {
  ...baseService,
  create: async (body: Record<string, unknown>) => baseService.create(await normalizeTourPayload(body)),
  update: async (id: string | number, body: Record<string, unknown>) => baseService.update(id, await normalizeTourPayload(body)),
  getTourByIdDetailed,
  getToursByCompetition,
  moveTour,
  removeTourWithResequence,
  getTourParticipants,
  addTourParticipant,
  removeTourParticipants,
  getTourRencontres,
};
