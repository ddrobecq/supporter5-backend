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
  PASource?: string;
  PAClassement?: number;
  PANbMatch?: number;
  PANbPoints?: number;
  PANbVD?: number;
  PANbVE?: number;
  PANbND?: number;
  PANbNE?: number;
  PANbDD?: number;
  PANbDE?: number;
  PANbBP?: number;
  PANbBC?: number;
  PADiff?: number;
  PARatio?: number;
  TDCalculDiffBut?: number;
  LOCKED_QUALIF_ABREGE?: string | null;
  LOCKED_QUALIF_LIBELLE?: string | null;
  LOCKED_QUALIF_COULEUR?: number | null;
  LOCKED_QUALIF_TYPE?: number | null;
}

interface QualifRuleRow {
  CLASS_MinRang: number;
  CLASS_MaxRang: number;
  CLASS_Couleur: number;
  CLASS_Libelle: string;
  CLASS_Type: number;
  CLASS_Abrege: string;
}

function addLockedQualificationMetadata(rows: TourParticipantRow[], tourId: number): TourParticipantRow[] {
  const tour = db.prepare(
    `SELECT t."NB_MATCH", COALESCE(td."VALEUR_VD", 3) AS "VALEUR_VD"
     FROM "TOUR" t
     LEFT JOIN "TOURDEF" td ON td."TDCLEUNIK" = t."TDCLEUNIK"
     WHERE t."TUCLEUNIK" = ? LIMIT 1`,
  ).get(tourId) as { NB_MATCH?: number; VALEUR_VD?: number } | undefined;
  const qualifs = db.prepare(
    `SELECT "CLASS_MinRang", "CLASS_MaxRang", "CLASS_Couleur", COALESCE("CLASS_Libelle", '') AS "CLASS_Libelle",
            "CLASS_Type", COALESCE("CLASS_Abrege", '') AS "CLASS_Abrege"
     FROM "Qualif" WHERE "TUCLEUNIK" = ?
     ORDER BY "CLASS_MinRang" ASC, "CLASS_MaxRang" ASC`,
  ).all(tourId) as QualifRuleRow[];

  if (!tour || qualifs.length === 0 || rows.length === 0) {
    return rows;
  }

  const maxMatches = Number(tour.NB_MATCH ?? 0);
  const winPoints = Number(tour.VALEUR_VD ?? 3);
  const groups = new Map<string, TourParticipantRow[]>();
  rows.forEach((row) => {
    const group = String(row.GROUPE ?? '').trim();
    const bucket = groups.get(group) ?? [];
    bucket.push(row);
    groups.set(group, bucket);
  });

  const metadata = new Map<number, QualifRuleRow | null>();
  groups.forEach((groupRows) => {
    const hasPlayedMatch = groupRows.some((groupRow) => Number(groupRow.PANbMatch ?? 0) > 0);
    const groupIsFinished = maxMatches > 0 && groupRows.every(
      (groupRow) => Number(groupRow.PANbMatch ?? 0) >= maxMatches,
    );
    groupRows.forEach((row) => {
      if (!hasPlayedMatch || groupIsFinished) {
        metadata.set(row.PACLEUNIK, null);
        return;
      }

      const currentPoints = Number(row.PANbPoints ?? 0);
      const played = Number(row.PANbMatch ?? 0);
      const remaining = Math.max(0, maxMatches - played);
      const maxPoints = currentPoints + (remaining * (Number.isFinite(winPoints) ? winPoints : 3));
      const bestRank = 1 + groupRows.filter((other) => (
        other.PACLEUNIK !== row.PACLEUNIK
        && Number(other.PANbPoints ?? 0) > maxPoints
      )).length;
      const worstRank = 1 + groupRows.filter((other) => (
        other.PACLEUNIK !== row.PACLEUNIK
        && Number(other.PANbPoints ?? 0)
          + (Math.max(0, maxMatches - Number(other.PANbMatch ?? 0)) * (Number.isFinite(winPoints) ? winPoints : 3))
          >= currentPoints
      )).length;
      const locked = qualifs.filter((qualif) => {
        const min = Number(qualif.CLASS_MinRang);
        const max = Number(qualif.CLASS_MaxRang);
        if ([1, 2, 3].includes(Number(qualif.CLASS_Type))) {
          return worstRank <= max;
        }
        if ([4, 5].includes(Number(qualif.CLASS_Type))) {
          return bestRank >= min;
        }
        return false;
      });

      const positive = locked.filter((qualif) => [1, 2, 3].includes(Number(qualif.CLASS_Type)));
      const negative = locked.filter((qualif) => [4, 5].includes(Number(qualif.CLASS_Type)));
      const selected = positive.length > 0
        ? positive.sort((left, right) => Number(left.CLASS_MinRang) - Number(right.CLASS_MinRang))[0]
        : negative.sort((left, right) => Number(right.CLASS_MinRang) - Number(left.CLASS_MinRang))[0];
      metadata.set(row.PACLEUNIK, selected ?? null);
    });
  });

  return rows.map((row) => {
    const locked = metadata.get(row.PACLEUNIK);
    return {
      ...row,
      LOCKED_QUALIF_ABREGE: locked?.CLASS_Abrege || null,
      LOCKED_QUALIF_LIBELLE: locked?.CLASS_Libelle || null,
      LOCKED_QUALIF_COULEUR: locked?.CLASS_Couleur ?? null,
      LOCKED_QUALIF_TYPE: locked?.CLASS_Type ?? null,
    };
  });
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
       COALESCE(p."GROUPE", '') AS "GROUPE",
      COALESCE(p."PASource", '') AS "PASource",
       COALESCE(p."PAClassement", 0) AS "PAClassement",
       COALESCE(p."PANbMatch", 0) AS "PANbMatch",
       COALESCE(p."PANbPoints", 0) AS "PANbPoints",
       COALESCE(p."PANbVD", 0) AS "PANbVD",
       COALESCE(p."PANbVE", 0) AS "PANbVE",
       COALESCE(p."PANbND", 0) AS "PANbND",
       COALESCE(p."PANbNE", 0) AS "PANbNE",
       COALESCE(p."PANbDD", 0) AS "PANbDD",
       COALESCE(p."PANbDE", 0) AS "PANbDE",
       COALESCE(p."PANbBP", 0) AS "PANbBP",
       COALESCE(p."PANbBC", 0) AS "PANbBC",
       COALESCE(p."PADiff", 0) AS "PADiff",
       COALESCE(p."PARatio", 0) AS "PARatio",
       COALESCE(td."TDCalculDiffBut", 1) AS "TDCalculDiffBut"
     FROM "PARTICIP" p
     LEFT JOIN "CLUB" c ON c."IDCLUB" = p."IDCLUB"
     JOIN "TOUR" t ON t."TUCLEUNIK" = p."TUCLEUNIK"
     JOIN "TOURDEF" td ON td."TDCLEUNIK" = t."TDCLEUNIK"
     WHERE p."TUCLEUNIK" = ?
     ORDER BY COALESCE(p."GROUPE", '') ASC, COALESCE(p."PAClassement", 999999) ASC, p."PANbPoints" DESC, c."CLUB" ASC, p."IDCLUB" ASC`,
    [id],
  );

  return addLockedQualificationMetadata(rows.map((row) => ({
    PACLEUNIK: Number(row.PACLEUNIK),
    TUCLEUNIK: Number(row.TUCLEUNIK),
    IDCLUB: String(row.IDCLUB ?? '').trim(),
    CLUB: String(row.CLUB ?? '').trim(),
    GROUPE: String(row.GROUPE ?? '').trim(),
    PASource: String(row.PASource ?? '').trim(),
    PAClassement: Number(row.PAClassement ?? 0),
    PANbMatch: Number(row.PANbMatch ?? 0),
    PANbPoints: Number(row.PANbPoints ?? 0),
    PANbVD: Number(row.PANbVD ?? 0),
    PANbVE: Number(row.PANbVE ?? 0),
    PANbND: Number(row.PANbND ?? 0),
    PANbNE: Number(row.PANbNE ?? 0),
    PANbDD: Number(row.PANbDD ?? 0),
    PANbDE: Number(row.PANbDE ?? 0),
    PANbBP: Number(row.PANbBP ?? 0),
    PANbBC: Number(row.PANbBC ?? 0),
    PADiff: Number(row.PADiff ?? 0),
    PARatio: Number(row.PARatio ?? 0),
    TDCalculDiffBut: Number(row.TDCalculDiffBut ?? 1),
  })), id);
}

function isValidPaSource(value: string): boolean {
  const parts = value.split(',').map((part) => part.trim());
  if (parts.length !== 3) {
    return false;
  }

  const [tourId, , rank] = parts;
  return /^\d+$/.test(tourId) && /^\d+$/.test(rank);
}

async function addTourParticipant(
  tourId: string | number,
  clubIdInput: string,
  groupeInput = '',
  paSourceInput = '',
): Promise<TourParticipantRow> {
  const tourIdValue = normalizeTourId(tourId);
  const clubId = String(clubIdInput ?? '').trim();
  const groupe = String(groupeInput ?? '').trim();
  const paSource = String(paSourceInput ?? '').trim();

  if (groupe.length > 20) {
    throw new AppError(400, 'Nom de groupe invalide (20 caracteres max).');
  }

  if (!clubId && !paSource) {
    throw new AppError(400, 'clubId ou paSource est requis.');
  }

  if (clubId && paSource) {
    throw new AppError(400, 'Utilisez soit clubId, soit paSource, pas les deux.');
  }

  if (paSource && !isValidPaSource(paSource)) {
    throw new AppError(400, 'Format paSource invalide (TUCLEUNIK,GROUPE,CLASSEMENT).');
  }

  if (!clubId) {
    const existingProgrammed = await dbGet<TourParticipantRow>(
      `SELECT
         p."PACLEUNIK" AS "PACLEUNIK",
         p."TUCLEUNIK" AS "TUCLEUNIK",
         p."IDCLUB" AS "IDCLUB",
         COALESCE(c."CLUB", '') AS "CLUB",
         COALESCE(p."GROUPE", '') AS "GROUPE",
         COALESCE(p."PASource", '') AS "PASource"
       FROM "PARTICIP" p
       LEFT JOIN "CLUB" c ON c."IDCLUB" = p."IDCLUB"
       WHERE p."TUCLEUNIK" = ?
         AND COALESCE(p."PASource", '') = ?
         AND (p."IDCLUB" IS NULL OR TRIM(COALESCE(p."IDCLUB", '')) = '')
       LIMIT 1`,
      [tourIdValue, paSource],
    );

    if (existingProgrammed) {
      const existingGroupe = String(existingProgrammed.GROUPE ?? '').trim();
      const shouldUpdateGroup = groupe.length > 0 && groupe !== existingGroupe;
      if (shouldUpdateGroup) {
        await dbRun(
          `UPDATE "PARTICIP"
           SET "GROUPE" = ?
           WHERE "PACLEUNIK" = ?`,
          [groupe, Number(existingProgrammed.PACLEUNIK)],
        );
      }

      const updatedProgrammed = await dbGet<TourParticipantRow>(
        `SELECT
           p."PACLEUNIK" AS "PACLEUNIK",
           p."TUCLEUNIK" AS "TUCLEUNIK",
           p."IDCLUB" AS "IDCLUB",
           COALESCE(c."CLUB", '') AS "CLUB",
           COALESCE(p."GROUPE", '') AS "GROUPE",
           COALESCE(p."PASource", '') AS "PASource"
         FROM "PARTICIP" p
         LEFT JOIN "CLUB" c ON c."IDCLUB" = p."IDCLUB"
         WHERE p."PACLEUNIK" = ?
         LIMIT 1`,
        [Number(existingProgrammed.PACLEUNIK)],
      );

      return {
        PACLEUNIK: Number(updatedProgrammed?.PACLEUNIK ?? existingProgrammed.PACLEUNIK),
        TUCLEUNIK: Number(updatedProgrammed?.TUCLEUNIK ?? existingProgrammed.TUCLEUNIK),
        IDCLUB: String(updatedProgrammed?.IDCLUB ?? existingProgrammed.IDCLUB ?? '').trim(),
        CLUB: String(updatedProgrammed?.CLUB ?? existingProgrammed.CLUB ?? '').trim(),
        GROUPE: String(updatedProgrammed?.GROUPE ?? existingProgrammed.GROUPE ?? '').trim(),
        PASource: String(updatedProgrammed?.PASource ?? existingProgrammed.PASource ?? '').trim(),
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
      ) VALUES ('', ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, ?, 0, 0)`,
      [tourIdValue, groupe, paSource],
    );

    const insertedProgrammed = await dbGet<TourParticipantRow>(
      `SELECT
         p."PACLEUNIK" AS "PACLEUNIK",
         p."TUCLEUNIK" AS "TUCLEUNIK",
         p."IDCLUB" AS "IDCLUB",
         COALESCE(c."CLUB", '') AS "CLUB",
         COALESCE(p."GROUPE", '') AS "GROUPE",
         COALESCE(p."PASource", '') AS "PASource"
       FROM "PARTICIP" p
       LEFT JOIN "CLUB" c ON c."IDCLUB" = p."IDCLUB"
       WHERE p."TUCLEUNIK" = ?
         AND COALESCE(p."PASource", '') = ?
         AND (p."IDCLUB" IS NULL OR TRIM(COALESCE(p."IDCLUB", '')) = '')
       ORDER BY p."PACLEUNIK" DESC
       LIMIT 1`,
      [tourIdValue, paSource],
    );

    if (!insertedProgrammed) {
      throw new AppError(500, 'Impossible d\'ajouter le participant programme.');
    }

    return {
      PACLEUNIK: Number(insertedProgrammed.PACLEUNIK),
      TUCLEUNIK: Number(insertedProgrammed.TUCLEUNIK),
      IDCLUB: String(insertedProgrammed.IDCLUB ?? '').trim(),
      CLUB: String(insertedProgrammed.CLUB ?? '').trim(),
      GROUPE: String(insertedProgrammed.GROUPE ?? '').trim(),
      PASource: String(insertedProgrammed.PASource ?? '').trim(),
    };
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
       COALESCE(p."GROUPE", '') AS "GROUPE",
       COALESCE(p."PASource", '') AS "PASource"
     FROM "PARTICIP" p
     LEFT JOIN "CLUB" c ON c."IDCLUB" = p."IDCLUB"
     WHERE p."TUCLEUNIK" = ? AND p."IDCLUB" = ?`,
    [tourIdValue, clubId],
  );

  if (existing) {
    const existingGroupe = String(existing.GROUPE ?? '').trim();
    const shouldUpdateGroup = groupe.length > 0 && groupe !== existingGroupe;
    if (shouldUpdateGroup) {
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
         COALESCE(p."GROUPE", '') AS "GROUPE",
         COALESCE(p."PASource", '') AS "PASource"
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
      PASource: String(updated?.PASource ?? existing.PASource ?? '').trim(),
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
       COALESCE(p."GROUPE", '') AS "GROUPE",
       COALESCE(p."PASource", '') AS "PASource"
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
    PASource: String(inserted.PASource ?? '').trim(),
  };
}

async function removeTourParticipants(
  tourId: string | number,
  clubIds: string[],
  participantIds: Array<string | number> = [],
): Promise<number> {
  const tourIdValue = normalizeTourId(tourId);
  const normalizedClubIds = clubIds
    .map((clubId) => String(clubId ?? '').trim())
    .filter((clubId) => clubId.length > 0);
  const normalizedParticipantIds = participantIds
    .map((participantId) => Number(participantId))
    .filter((participantId) => Number.isInteger(participantId) && participantId > 0);

  if (normalizedClubIds.length === 0 && normalizedParticipantIds.length === 0) {
    return 0;
  }

  const whereClauses: string[] = [];
  const whereParams: Array<string | number> = [];

  if (normalizedParticipantIds.length > 0) {
    const participantPlaceholders = normalizedParticipantIds.map(() => '?').join(', ');
    whereClauses.push(`"PACLEUNIK" IN (${participantPlaceholders})`);
    whereParams.push(...normalizedParticipantIds);
  }

  if (normalizedClubIds.length > 0) {
    const clubPlaceholders = normalizedClubIds.map(() => '?').join(', ');
    whereClauses.push(`"IDCLUB" IN (${clubPlaceholders})`);
    whereParams.push(...normalizedClubIds);
  }

  const result = await dbRun(
    `DELETE FROM "PARTICIP"
     WHERE "TUCLEUNIK" = ?
       AND (${whereClauses.join(' OR ')})`,
    [tourIdValue, ...whereParams],
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
