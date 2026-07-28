import db, { dbAll } from '../config/database';
import { createEntityService } from '../lib/baseService';
import { AppError } from '../types';

export interface CalendarMatchRow {
  RECLEUNIK: string | number;
  DATE: string;
  HEURE: string;
  ETAT: number;
  DOMICILE: string;
  EXTERIEUR: string;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
}

export interface RencontreDetailRow {
  RECLEUNIK: number;
  DATE: string | null;
  HEURE: string | null;
  ETAT: number;
  DOMICILE: string;
  EXTERIEUR: string;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  IDCIRC: string | null;
  TUCLEUNIK: number;
  SAISON: string;
  READMIN: number | null;
  COMMENT: string | null;
  VID_ID: number | null;
  PADOMSource: string | null;
  PAEXTSource: string | null;
  COCLEUNIK: number;
  TOUR_NOM: string;
  TYPE_TOUR: number;
  DOMICILE_ABREGE: string;
  EXTERIEUR_ABREGE: string;
  DOMICILE_FOND: string | number | null;
  DOMICILE_TEXTE: string | number | null;
  EXTERIEUR_FOND: string | number | null;
  EXTERIEUR_TEXTE: string | number | null;
  DOMICILE_NOM_EFFECTIF: string;
  EXTERIEUR_NOM_EFFECTIF: string;
}

interface RencontresRow {
  RECLEUNIK: number;
  DOMICILE: string;
  EXTERIEUR: string;
  DATE: string | null;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  IDCIRC: string | null;
  ETAT: number;
  TUCLEUNIK: number;
  HEURE: string | null;
  SAISON: string;
  READMIN: number | null;
  COMMENT: string | null;
  VID_ID: number | null;
  PADOMSource: string | null;
  PAEXTSource: string | null;
}

interface ParticipantDbRow {
  IDCLUB: string;
  TUCLEUNIK: number;
  GROUPE: string;
}

interface TourDefRules {
  VALEUR_VD: number;
  VALEUR_VE: number;
  VALEUR_ND: number;
  VALEUR_NE: number;
  VALEUR_DD: number;
  VALEUR_DE: number;
  BONUS_TYPE: number;
  BONUS_NB_BUT: number;
  VALEUR_BONUS_V: number;
  VALEUR_BONUS_N: number;
  VALEUR_BONUS_D: number;
}

interface ParticipantStats {
  IDCLUB: string;
  PANbMatch: number;
  PANbPoints: number;
  PANbVD: number;
  PANbVE: number;
  PANbND: number;
  PANbNE: number;
  PANbDD: number;
  PANbDE: number;
  PANbBPD: number;
  PANbBCD: number;
  PABonus: number;
  PANbBPE: number;
  PANbBCE: number;
  PADiff: number;
  PANbBP: number;
  PANbV: number;
  PANbTaBP: number;
  PANbTaBC: number;
  PADiffTaB: number;
  PANbBC: number;
  PARatio: number;
}

type MatchOutcome = 'dom-win' | 'ext-win' | 'draw' | 'both-loss';
type TeamOutcome = 'V' | 'N' | 'D';
type TeamSide = 'dom' | 'ext';

function toInt(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.trunc(numeric);
}

function toNum(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function toText(value: unknown): string {
  return String(value ?? '').trim();
}

function readRencontreRowById(id: string | number): RencontresRow | undefined {
  const row = db.prepare(
    `SELECT
      "RECLEUNIK",
      "DOMICILE",
      "EXTERIEUR",
      "DATE",
      "BUTDOM",
      "BUTEXT",
      "TABDOM",
      "TABEXT",
      "IDCIRC",
      "ETAT",
      "TUCLEUNIK",
      "HEURE",
      "SAISON",
      "READMIN",
      "COMMENT",
      "VID_ID",
      "PADOMSource",
      "PAEXTSource"
     FROM "RENCO"
     WHERE "RECLEUNIK" = ?
     LIMIT 1`,
  ).get(id) as Record<string, unknown> | undefined;

  if (!row) {
    return undefined;
  }

  return {
    RECLEUNIK: toInt(row.RECLEUNIK),
    DOMICILE: toText(row.DOMICILE),
    EXTERIEUR: toText(row.EXTERIEUR),
    DATE: row.DATE == null ? null : toText(row.DATE),
    BUTDOM: toInt(row.BUTDOM),
    BUTEXT: toInt(row.BUTEXT),
    TABDOM: toInt(row.TABDOM),
    TABEXT: toInt(row.TABEXT),
    IDCIRC: row.IDCIRC == null ? null : toText(row.IDCIRC),
    ETAT: toInt(row.ETAT),
    TUCLEUNIK: toInt(row.TUCLEUNIK),
    HEURE: row.HEURE == null ? null : toText(row.HEURE),
    SAISON: toText(row.SAISON),
    READMIN: row['READMIN'] == null ? null : toInt(row['READMIN']),
    COMMENT: row.COMMENT == null ? null : String(row.COMMENT),
    VID_ID: row.VID_ID == null ? null : toInt(row.VID_ID),
    PADOMSource: row.PADOMSource == null ? null : String(row.PADOMSource),
    PAEXTSource: row.PAEXTSource == null ? null : String(row.PAEXTSource),
  };
}

function readTourDefRulesByTourId(tourId: number): TourDefRules {
  const row = db.prepare(
    `SELECT
      td."VALEUR_VD",
      td."VALEUR_VE",
      td."VALEUR_ND",
      td."VALEUR_NE",
      td."VALEUR_DD",
      td."VALEUR_DE",
      td."BONUS_TYPE",
      td."BONUS_NB_BUT",
      td."VALEUR_BONUS_V",
      td."VALEUR_BONUS_N",
      td."VALEUR_BONUS_D"
     FROM "TOUR" t
     JOIN "TOURDEF" td ON td."TDCLEUNIK" = t."TDCLEUNIK"
     WHERE t."TUCLEUNIK" = ?
     LIMIT 1`,
  ).get(tourId) as Record<string, unknown> | undefined;

  if (!row) {
    throw new AppError(400, 'TourDef introuvable pour ce tour.');
  }

  return {
    VALEUR_VD: toNum(row.VALEUR_VD),
    VALEUR_VE: toNum(row.VALEUR_VE),
    VALEUR_ND: toNum(row.VALEUR_ND),
    VALEUR_NE: toNum(row.VALEUR_NE),
    VALEUR_DD: toNum(row.VALEUR_DD),
    VALEUR_DE: toNum(row.VALEUR_DE),
    BONUS_TYPE: toInt(row.BONUS_TYPE, 1),
    BONUS_NB_BUT: toNum(row.BONUS_NB_BUT),
    VALEUR_BONUS_V: toNum(row.VALEUR_BONUS_V),
    VALEUR_BONUS_N: toNum(row.VALEUR_BONUS_N),
    VALEUR_BONUS_D: toNum(row.VALEUR_BONUS_D),
  };
}

function readParticipantByTourAndClub(tourId: number, clubId: string): ParticipantDbRow | undefined {
  const row = db.prepare(
    `SELECT
      "IDCLUB",
      "TUCLEUNIK",
      COALESCE("GROUPE", '') AS "GROUPE"
     FROM "PARTICIP"
     WHERE "TUCLEUNIK" = ? AND "IDCLUB" = ?
     LIMIT 1`,
  ).get(tourId, clubId) as Record<string, unknown> | undefined;

  if (!row) {
    return undefined;
  }

  return {
    IDCLUB: toText(row.IDCLUB),
    TUCLEUNIK: toInt(row.TUCLEUNIK),
    GROUPE: toText(row.GROUPE),
  };
}

function shouldCountMatch(row: RencontresRow): boolean {
  const readmin = toInt(row['READMIN'] ?? 0);
  if (readmin >= 1 && readmin <= 4) {
    return true;
  }
  const etat = toInt(row.ETAT, 0);
  return etat === 2 || etat === 3;
}

function determineOutcome(row: RencontresRow): MatchOutcome {
  const adminDecision = toInt(row['READMIN'] ?? 0);
  if (adminDecision === 1) return 'dom-win';
  if (adminDecision === 2) return 'ext-win';
  if (adminDecision === 3) return 'draw';
  if (adminDecision === 4) return 'both-loss';

  if (row.BUTDOM > row.BUTEXT) return 'dom-win';
  if (row.BUTDOM < row.BUTEXT) return 'ext-win';
  return 'draw';
}

function resolveTeamOutcome(side: TeamSide, outcome: MatchOutcome): TeamOutcome {
  if (outcome === 'both-loss') return 'D';
  if (outcome === 'draw') return 'N';
  if (outcome === 'dom-win') return side === 'dom' ? 'V' : 'D';
  return side === 'ext' ? 'V' : 'D';
}

function createEmptyParticipantStats(clubId: string): ParticipantStats {
  return {
    IDCLUB: clubId,
    PANbMatch: 0,
    PANbPoints: 0,
    PANbVD: 0,
    PANbVE: 0,
    PANbND: 0,
    PANbNE: 0,
    PANbDD: 0,
    PANbDE: 0,
    PANbBPD: 0,
    PANbBCD: 0,
    PABonus: 0,
    PANbBPE: 0,
    PANbBCE: 0,
    PADiff: 0,
    PANbBP: 0,
    PANbV: 0,
    PANbTaBP: 0,
    PANbTaBC: 0,
    PADiffTaB: 0,
    PANbBC: 0,
    PARatio: 0,
  };
}

function resolvePointsForOutcome(rules: TourDefRules, side: TeamSide, outcome: TeamOutcome): number {
  if (side === 'dom') {
    if (outcome === 'V') return rules.VALEUR_VD;
    if (outcome === 'N') return rules.VALEUR_ND;
    return rules.VALEUR_DD;
  }
  if (outcome === 'V') return rules.VALEUR_VE;
  if (outcome === 'N') return rules.VALEUR_NE;
  return rules.VALEUR_DE;
}

function resolveBonusValueForOutcome(rules: TourDefRules, outcome: TeamOutcome): number {
  if (outcome === 'V') return rules.VALEUR_BONUS_V;
  if (outcome === 'N') return rules.VALEUR_BONUS_N;
  return rules.VALEUR_BONUS_D;
}

function resolveMatchBonus(
  rules: TourDefRules,
  outcome: TeamOutcome,
  butsPour: number,
  butsContre: number,
): number {
  const bonusType = toInt(rules.BONUS_TYPE, 1);
  const bonusBase = resolveBonusValueForOutcome(rules, outcome);
  const threshold = toNum(rules.BONUS_NB_BUT, 0);

  if (bonusType === 2) {
    return butsPour > threshold ? bonusBase : 0;
  }

  if (bonusType === 3) {
    const diff = butsPour - butsContre;
    return diff > threshold ? bonusBase : 0;
  }

  if (bonusType === 4) {
    if (butsPour <= threshold) return 0;
    return (butsPour - threshold) * bonusBase;
  }

  return 0;
}

function applyMatchToParticipant(
  stats: ParticipantStats,
  side: TeamSide,
  row: RencontresRow,
  rules: TourDefRules,
): void {
  const outcome = determineOutcome(row);
  const teamOutcome = resolveTeamOutcome(side, outcome);

  const butsPour = side === 'dom' ? row.BUTDOM : row.BUTEXT;
  const butsContre = side === 'dom' ? row.BUTEXT : row.BUTDOM;
  const tabPour = side === 'dom' ? row.TABDOM : row.TABEXT;
  const tabContre = side === 'dom' ? row.TABEXT : row.TABDOM;

  stats.PANbMatch += 1;

  if (side === 'dom') {
    if (teamOutcome === 'V') stats.PANbVD += 1;
    if (teamOutcome === 'N') stats.PANbND += 1;
    if (teamOutcome === 'D') stats.PANbDD += 1;
    stats.PANbBPD += butsPour;
    stats.PANbBCD += butsContre;
  } else {
    if (teamOutcome === 'V') stats.PANbVE += 1;
    if (teamOutcome === 'N') stats.PANbNE += 1;
    if (teamOutcome === 'D') stats.PANbDE += 1;
    stats.PANbBPE += butsPour;
    stats.PANbBCE += butsContre;
  }

  stats.PANbTaBP += tabPour;
  stats.PANbTaBC += tabContre;

  const points = resolvePointsForOutcome(rules, side, teamOutcome);
  const bonus = resolveMatchBonus(rules, teamOutcome, butsPour, butsContre);

  stats.PANbPoints += points + bonus;
  stats.PABonus += bonus;
}

function finalizeParticipantStats(stats: ParticipantStats): ParticipantStats {
  const butsPour = stats.PANbBPD + stats.PANbBPE;
  const butsContre = stats.PANbBCD + stats.PANbBCE;
  stats.PANbBP = butsPour;
  stats.PANbBC = butsContre;
  stats.PADiff = butsPour - butsContre;
  stats.PANbV = stats.PANbVD + stats.PANbVE;
  stats.PADiffTaB = stats.PANbTaBP - stats.PANbTaBC;
  stats.PARatio = butsContre === 0 ? 99999 : butsPour / butsContre;
  return stats;
}

export function sortParticipantsByPointsDesc(rows: ParticipantStats[]): ParticipantStats[] {
  return [...rows].sort((a, b) => {
    if (b.PANbPoints !== a.PANbPoints) {
      return b.PANbPoints - a.PANbPoints;
    }
    return a.IDCLUB.localeCompare(b.IDCLUB, 'fr', { sensitivity: 'base' });
  });
}

function writeParticipantStats(tourId: number, groupName: string, rankedRows: ParticipantStats[]): void {
  const updateStmt = db.prepare(
    `UPDATE "PARTICIP" SET
      "PAClassement" = ?,
      "PANbMatch" = ?,
      "PANbPoints" = ?,
      "PANbVD" = ?,
      "PANbVE" = ?,
      "PANbND" = ?,
      "PANbNE" = ?,
      "PANbDD" = ?,
      "PANbDE" = ?,
      "PANbBPD" = ?,
      "PANbBCD" = ?,
      "PABonus" = ?,
      "PANbBPE" = ?,
      "PANbBCE" = ?,
      "PADiff" = ?,
      "PANbBP" = ?,
      "PANbV" = ?,
      "PANbTaBP" = ?,
      "PANbTaBC" = ?,
      "PADiffTaB" = ?,
      "PANbBC" = ?,
      "PARatio" = ?
     WHERE "TUCLEUNIK" = ?
       AND "IDCLUB" = ?
       AND COALESCE("GROUPE", '') = ?`,
  );

  rankedRows.forEach((row, index) => {
    updateStmt.run(
      index + 1,
      row.PANbMatch,
      row.PANbPoints,
      row.PANbVD,
      row.PANbVE,
      row.PANbND,
      row.PANbNE,
      row.PANbDD,
      row.PANbDE,
      row.PANbBPD,
      row.PANbBCD,
      row.PABonus,
      row.PANbBPE,
      row.PANbBCE,
      row.PADiff,
      row.PANbBP,
      row.PANbV,
      row.PANbTaBP,
      row.PANbTaBC,
      row.PADiffTaB,
      row.PANbBC,
      row.PARatio,
      tourId,
      row.IDCLUB,
      groupName,
    );
  });
}

function recomputeGroupStandings(tourId: number, groupName: string): void {
  const participants = db.prepare(
    `SELECT
      "IDCLUB",
      "TUCLEUNIK",
      COALESCE("GROUPE", '') AS "GROUPE"
     FROM "PARTICIP"
     WHERE "TUCLEUNIK" = ? AND COALESCE("GROUPE", '') = ?
     ORDER BY "IDCLUB" ASC`,
  ).all(tourId, groupName) as Array<Record<string, unknown>>;

  if (participants.length === 0) {
    return;
  }

  const rules = readTourDefRulesByTourId(tourId);
  const clubIds = participants.map((row) => toText(row.IDCLUB)).filter((value) => value.length > 0);

  const statsByClub = new Map<string, ParticipantStats>();
  clubIds.forEach((clubId) => {
    statsByClub.set(clubId, createEmptyParticipantStats(clubId));
  });

  const placeholders = clubIds.map(() => '?').join(', ');
  const matchRowsRaw = db.prepare(
    `SELECT
      "RECLEUNIK",
      "DOMICILE",
      "EXTERIEUR",
      "DATE",
      "BUTDOM",
      "BUTEXT",
      "TABDOM",
      "TABEXT",
      "IDCIRC",
      "ETAT",
      "TUCLEUNIK",
      "HEURE",
      "SAISON",
      "READMIN",
      "COMMENT",
      "VID_ID",
      "PADOMSource",
      "PAEXTSource"
     FROM "RENCO"
     WHERE "TUCLEUNIK" = ?
       AND "DOMICILE" IN (${placeholders})
       AND "EXTERIEUR" IN (${placeholders})
     ORDER BY "RECLEUNIK" ASC`,
  ).all(tourId, ...clubIds, ...clubIds) as Array<Record<string, unknown>>;

  const matchRows: RencontresRow[] = matchRowsRaw.map((row) => ({
    RECLEUNIK: toInt(row.RECLEUNIK),
    DOMICILE: toText(row.DOMICILE),
    EXTERIEUR: toText(row.EXTERIEUR),
    DATE: row.DATE == null ? null : toText(row.DATE),
    BUTDOM: toInt(row.BUTDOM),
    BUTEXT: toInt(row.BUTEXT),
    TABDOM: toInt(row.TABDOM),
    TABEXT: toInt(row.TABEXT),
    IDCIRC: row.IDCIRC == null ? null : toText(row.IDCIRC),
    ETAT: toInt(row.ETAT),
    TUCLEUNIK: toInt(row.TUCLEUNIK),
    HEURE: row.HEURE == null ? null : toText(row.HEURE),
    SAISON: toText(row.SAISON),
    READMIN: row['READMIN'] == null ? null : toInt(row['READMIN']),
    COMMENT: row.COMMENT == null ? null : String(row.COMMENT),
    VID_ID: row.VID_ID == null ? null : toInt(row.VID_ID),
    PADOMSource: row.PADOMSource == null ? null : String(row.PADOMSource),
    PAEXTSource: row.PAEXTSource == null ? null : String(row.PAEXTSource),
  }));

  matchRows.forEach((row) => {
    if (!shouldCountMatch(row)) {
      return;
    }

    const domStats = statsByClub.get(row.DOMICILE);
    const extStats = statsByClub.get(row.EXTERIEUR);
    if (!domStats || !extStats) {
      return;
    }

    applyMatchToParticipant(domStats, 'dom', row, rules);
    applyMatchToParticipant(extStats, 'ext', row, rules);
  });

  const finalized = Array.from(statsByClub.values()).map((row) => finalizeParticipantStats(row));
  const ranked = sortParticipantsByPointsDesc(finalized);
  writeParticipantStats(tourId, groupName, ranked);
}

function recomputeAllGroupsForTour(tourId: number): void {
  const groups = db.prepare(
    `SELECT DISTINCT COALESCE("GROUPE", '') AS "GROUPE"
     FROM "PARTICIP"
     WHERE "TUCLEUNIK" = ?`,
  ).all(tourId) as Array<Record<string, unknown>>;

  groups.forEach((row) => {
    const groupName = toText(row.GROUPE);
    recomputeGroupStandings(tourId, groupName);
  });
}

function collectImpactedGroups(row: RencontresRow): string[] {
  const groups = new Set<string>();

  const dom = readParticipantByTourAndClub(row.TUCLEUNIK, row.DOMICILE);
  const ext = readParticipantByTourAndClub(row.TUCLEUNIK, row.EXTERIEUR);

  if (dom) groups.add(dom.GROUPE);
  if (ext) groups.add(ext.GROUPE);

  return [...groups];
}

function assertValidRencontreBody(body: Record<string, unknown>): void {
  const domicile = toText(body.DOMICILE);
  const exterieur = toText(body.EXTERIEUR);
  const tourId = toInt(body.TUCLEUNIK);

  if (!domicile || !exterieur) {
    throw new AppError(400, 'DOMICILE et EXTERIEUR sont requis.');
  }
  if (domicile === exterieur) {
    throw new AppError(400, 'DOMICILE et EXTERIEUR doivent etre differents.');
  }
  if (!Number.isInteger(tourId) || tourId <= 0) {
    throw new AppError(400, 'TUCLEUNIK invalide.');
  }
}

async function createWithImpact(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  assertValidRencontreBody(body);

  const keys = Object.keys(body);
  if (keys.length === 0) {
    throw new AppError(400, 'No fields provided');
  }

  const cols = keys.map((c) => `"${c}"`).join(', ');
  const marks = keys.map(() => '?').join(', ');
  const values = Object.values(body);

  const transaction = db.transaction((payloadValues: unknown[]) => {
    const result = db.prepare(`INSERT INTO "RENCO" (${cols}) VALUES (${marks})`).run(...payloadValues as []);
    const insertedIdRaw = body.RECLEUNIK ?? result.lastInsertRowid;
    const insertedId = toInt(typeof insertedIdRaw === 'bigint' ? Number(insertedIdRaw) : insertedIdRaw);
    if (!Number.isInteger(insertedId) || insertedId <= 0) {
      throw new AppError(500, 'Impossible de determiner la rencontre creee.');
    }

    const insertedRow = readRencontreRowById(insertedId);
    if (!insertedRow) {
      throw new AppError(500, 'Rencontre creee introuvable.');
    }

    recomputeAllGroupsForTour(insertedRow.TUCLEUNIK);

    return insertedId;
  });

  const insertedId = transaction(values);
  return baseService.getById(insertedId);
}

async function updateWithImpact(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const rencontreId = toInt(id);
  if (!Number.isInteger(rencontreId) || rencontreId <= 0) {
    throw new AppError(400, 'Identifiant de rencontre invalide.');
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    throw new AppError(400, 'No fields provided');
  }

  const transaction = db.transaction(() => {
    const beforeRow = readRencontreRowById(rencontreId);
    if (!beforeRow) {
      return false;
    }

    const sets = keys.map((c) => `"${c}" = ?`).join(', ');
    db.prepare(`UPDATE "RENCO" SET ${sets} WHERE "RECLEUNIK" = ?`).run(...Object.values(body) as [], rencontreId);

    const afterRow = readRencontreRowById(rencontreId);
    if (!afterRow) {
      throw new AppError(500, 'Impossible de relire la rencontre modifiee.');
    }

    const impactedTours = new Set<number>();
    impactedTours.add(beforeRow.TUCLEUNIK);
    impactedTours.add(afterRow.TUCLEUNIK);

    impactedTours.forEach((tourId) => {
      recomputeAllGroupsForTour(tourId);
    });

    return true;
  });

  const updated = transaction();
  if (!updated) {
    return undefined;
  }
  return baseService.getById(rencontreId);
}

async function removeWithImpact(id: string | number): Promise<boolean> {
  const rencontreId = toInt(id);
  if (!Number.isInteger(rencontreId) || rencontreId <= 0) {
    throw new AppError(400, 'Identifiant de rencontre invalide.');
  }

  const transaction = db.transaction(() => {
    const row = readRencontreRowById(rencontreId);
    if (!row) {
      return false;
    }

    db.prepare('DELETE FROM "RENCO" WHERE "RECLEUNIK" = ?').run(rencontreId);
    recomputeAllGroupsForTour(row.TUCLEUNIK);
    return true;
  });

  return transaction();
}

const baseService = createEntityService({
  table:           'RENCO',
  pk:              'RECLEUNIK',
  selectCols:      [
    'RECLEUNIK',
    'DOMICILE',
    'EXTERIEUR',
    'DATE',
    'BUTDOM',
    'BUTEXT',
    'TABDOM',
    'TABEXT',
    'IDCIRC',
    'ETAT',
    'TUCLEUNIK',
    'HEURE',
    'SAISON',
    'READMIN',
    'COMMENT',
    'VID_ID',
    'PADOMSource',
    'PAEXTSource',
  ],
  allowedSortCols: ['RECLEUNIK', 'DATE', 'SAISON', 'BUTDOM', 'BUTEXT', 'HEURE'],
  searchCols:      ['COMMENT'],
  filterCols:      ['SAISON', 'DOMICILE', 'EXTERIEUR', 'ETAT', 'TUCLEUNIK'],
});

export async function getCalendarByDate(date: string): Promise<CalendarMatchRow[]> {
  return dbAll<CalendarMatchRow>(
    `SELECT
      r.RECLEUNIK,
      r.DATE,
      r.HEURE,
      r.ETAT,
      r.DOMICILE,
      r.EXTERIEUR,
      r.BUTDOM,
      r.BUTEXT,
      r.TABDOM,
      r.TABEXT,
      COALESCE(cd.CLUB, r.DOMICILE) AS DOMICILE_NOM,
      COALESCE(ce.CLUB, r.EXTERIEUR) AS EXTERIEUR_NOM
     FROM RENCO r
     LEFT JOIN CLUB cd ON cd.IDCLUB = r.DOMICILE
     LEFT JOIN CLUB ce ON ce.IDCLUB = r.EXTERIEUR
     WHERE r.DATE = ?
     ORDER BY r.HEURE ASC, r.RECLEUNIK ASC`,
    [date],
  );
}

export async function getRencontreDetailById(id: string | number): Promise<RencontreDetailRow | undefined> {
  return dbAll<RencontreDetailRow>(
    `SELECT
      r.RECLEUNIK,
      r.DATE,
      r.HEURE,
      r.ETAT,
      r.DOMICILE,
      r.EXTERIEUR,
      r.BUTDOM,
      r.BUTEXT,
      r.TABDOM,
      r.TABEXT,
      r.IDCIRC,
      r.TUCLEUNIK,
      r.SAISON,
      r."READMIN" AS READMIN,
      r.COMMENT,
      r.VID_ID,
      r.PADOMSource,
      r.PAEXTSource,
      t.COCLEUNIK,
      COALESCE(t.NOM, '') AS TOUR_NOM,
      COALESCE(td.TDTYPETOUR, 1) AS TYPE_TOUR,
      COALESCE(cd.CLUB, '') AS DOMICILE_ABREGE,
      COALESCE(ce.CLUB, '') AS EXTERIEUR_ABREGE,
      cd.FOND AS DOMICILE_FOND,
      cd.TEXTE AS DOMICILE_TEXTE,
      ce.FOND AS EXTERIEUR_FOND,
      ce.TEXTE AS EXTERIEUR_TEXTE,
      COALESCE((
        SELECT cn.CN_NOM
        FROM CLUB_NOM cn
        WHERE cn.IDCLUB = r.DOMICILE
          AND (cn.CN_ACTION IS NULL OR cn.CN_ACTION <> 3)
          AND (
            REPLACE(COALESCE(r.DATE, ''), '-', '') = ''
            OR REPLACE(COALESCE(cn.DATE, ''), '-', '') <= REPLACE(COALESCE(r.DATE, ''), '-', '')
          )
        ORDER BY REPLACE(COALESCE(cn.DATE, ''), '-', '') DESC, cn.IDCLUB_NOM DESC
        LIMIT 1
      ), COALESCE(cd.CLUB, ''), '') AS DOMICILE_NOM_EFFECTIF,
      COALESCE((
        SELECT cn.CN_NOM
        FROM CLUB_NOM cn
        WHERE cn.IDCLUB = r.EXTERIEUR
          AND (cn.CN_ACTION IS NULL OR cn.CN_ACTION <> 3)
          AND (
            REPLACE(COALESCE(r.DATE, ''), '-', '') = ''
            OR REPLACE(COALESCE(cn.DATE, ''), '-', '') <= REPLACE(COALESCE(r.DATE, ''), '-', '')
          )
        ORDER BY REPLACE(COALESCE(cn.DATE, ''), '-', '') DESC, cn.IDCLUB_NOM DESC
        LIMIT 1
      ), COALESCE(ce.CLUB, ''), '') AS EXTERIEUR_NOM_EFFECTIF
     FROM RENCO r
     LEFT JOIN TOUR t ON t.TUCLEUNIK = r.TUCLEUNIK
     LEFT JOIN TOURDEF td ON td.TDCLEUNIK = t.TDCLEUNIK
     LEFT JOIN CLUB cd ON cd.IDCLUB = r.DOMICILE
     LEFT JOIN CLUB ce ON ce.IDCLUB = r.EXTERIEUR
     WHERE r.RECLEUNIK = ?
     LIMIT 1`,
    [id],
  ).then((rows) => rows[0]);
}

export default {
  ...baseService,
  getCalendarByDate,
  getRencontreDetailById,
  createWithImpact,
  updateWithImpact,
  removeWithImpact,
};





