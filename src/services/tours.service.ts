import db, { dbAll, dbGet, dbRun } from '../config/database';
import { AppError } from '../types';
import { createEntityService } from '../lib/baseService';

export interface CompetitionTourGridRow {
  TUCLEUNIK: number;
  COCLEUNIK: number;
  TU_ORDRE: number;
  TOUR: string;
  TYPE_ID: number;
  TYPE: string;
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

async function getToursByCompetition(competitionId: string | number): Promise<CompetitionTourGridRow[]> {
  const id = normalizeCompetitionId(competitionId);
  const rows = await dbAll<{
    TUCLEUNIK: number;
    COCLEUNIK: number;
    TU_ORDRE: number;
    TOUR: string;
    TYPE_ID: number | null;
  }>(
    `SELECT
       t."TUCLEUNIK" AS "TUCLEUNIK",
       t."COCLEUNIK" AS "COCLEUNIK",
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

export default {
  ...baseService,
  getToursByCompetition,
  moveTour,
  removeTourWithResequence,
};
