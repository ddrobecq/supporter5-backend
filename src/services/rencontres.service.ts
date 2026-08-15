import db, { dbAll } from '../config/database';
import { createEntityService } from '../lib/baseService';
import { getSupportedClubIdFromEnv } from '../lib/supportedClub';
import { AppError } from '../types';

export interface CalendarMatchRow {
  RECLEUNIK: string | number;
  TUCLEUNIK: number;
  TYPE_TOUR?: number;
  DATE: string;
  HEURE: string;
  ETAT: number;
  IDCIRC: string | null;
  CIRC: string | null;
  TOUR_NOM: string;
  COMPET_NOM: string;
  COCLEUNIK: number | null;
  CO_WEB: string | null;
  SAISON: string;
  CO_ANNEE: number;
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
  MACLEUNIK: number | null;
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
  DOMICILE_NOM_COMPLET: string;
  EXTERIEUR_NOM_COMPLET: string;
  IDARBITRE: string | null;
  ARBITRE_NOM: string;
  ARBITRE_PRENOM: string;
  TECLEUNIK: string | null;
  TERRAIN_NOM: string;
  TERRAIN_VILLE: string;
  TERRAIN_DISPLAY: string;
  NBSPECT: number;
  SUPPORTED_CLUB_ID: string;
  IS_SUPPORTED_CLUB_MATCH: number;
  SUPPORTED_CLUB_SIDE: 'home' | 'away' | 'none';
}

type SupportedClubSide = 'home' | 'away' | 'none';

export interface RencontreHighlightEventRow {
  EVCLEUNIK: number;
  MINUTE: number;
  PERIODE: number;
  TYPE_EVENT: number;
  ADVERSAIRE: number;
  JOUEUR1: string | null;
  JOUEUR2: string | null;
  COMMENT: string | null;
  SIDE: 'home' | 'away' | null;
  TEXT: string;
}

export interface RencontreHighlightsRow {
  RECLEUNIK: number;
  MACLEUNIK: number | null;
  SUPPORTED_CLUB_ID: string;
  IS_SUPPORTED_CLUB_MATCH: number;
  SUPPORTED_CLUB_SIDE: SupportedClubSide;
  EVENTS: RencontreHighlightEventRow[];
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

interface PaSourceRef {
  tourId: number;
  groupName: string;
  rank: number;
}

interface SourceTourMeta {
  typeId: number;
  allerRetour: number;
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
  TDCLEFTRI: string;
}

type SortDirection = '+' | '-';

interface ParticipantSortCriterion {
  direction: SortDirection;
  field: keyof ParticipantStats;
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

function parsePaSource(value: unknown): PaSourceRef | null {
  const raw = toText(value);
  if (!raw) {
    return null;
  }

  const parts = raw.split(',');
  if (parts.length !== 3) {
    return null;
  }

  const tourId = toInt(parts[0], 0);
  const groupName = String(parts[1] ?? '').trim();
  const rank = toInt(parts[2], 0);

  if (!Number.isInteger(tourId) || tourId <= 0) {
    return null;
  }
  if (!Number.isInteger(rank) || rank <= 0) {
    return null;
  }

  return { tourId, groupName, rank };
}

function getClubNameById(clubId: string, cache: Map<string, string>): string {
  const normalized = toText(clubId);
  if (!normalized) {
    return '';
  }

  const cached = cache.get(normalized);
  if (cached !== undefined) {
    return cached;
  }

  const row = db.prepare('SELECT COALESCE("CLUB", "IDCLUB") AS "CLUB" FROM "CLUB" WHERE "IDCLUB" = ? LIMIT 1')
    .get(normalized) as Record<string, unknown> | undefined;

  const label = row ? toText(row.CLUB) : normalized;
  cache.set(normalized, label || normalized);
  return label || normalized;
}

function resolveProgrammedCandidatesFromSource(
  sourceValue: string,
  visited: Set<string> = new Set(),
  cache: Map<string, string[]> = new Map(),
  clubNameCache: Map<string, string> = new Map(),
): string[] {
  const normalizedSource = toText(sourceValue);
  if (!normalizedSource) {
    return [];
  }

  const cached = cache.get(normalizedSource);
  if (cached) {
    return [...cached];
  }

  const parsed = parsePaSource(normalizedSource);
  if (!parsed) {
    cache.set(normalizedSource, []);
    return [];
  }

  const cycleKey = `${parsed.tourId}|${parsed.groupName}|${parsed.rank}`;
  if (visited.has(cycleKey)) {
    cache.set(normalizedSource, []);
    return [];
  }

  visited.add(cycleKey);

  const rows = db.prepare(
    `SELECT
       COALESCE("IDCLUB", '') AS "IDCLUB",
       COALESCE("PASource", '') AS "PASource"
     FROM "PARTICIP"
     WHERE "TUCLEUNIK" = ?
       AND COALESCE("GROUPE", '') = ?
       AND COALESCE("PAClassement", 0) = ?`,
  ).all(parsed.tourId, parsed.groupName, parsed.rank) as Array<Record<string, unknown>>;

  const names = new Set<string>();

  rows.forEach((row) => {
    const clubId = toText(row.IDCLUB);
    if (clubId) {
      names.add(getClubNameById(clubId, clubNameCache));
      return;
    }

    const nestedSource = toText(row.PASource);
    if (!nestedSource) {
      return;
    }

    resolveProgrammedCandidatesFromSource(nestedSource, visited, cache, clubNameCache)
      .forEach((name) => names.add(name));
  });

  visited.delete(cycleKey);
  const resolved = [...names];
  cache.set(normalizedSource, resolved);
  return resolved;
}

function resolveProgrammedClubIdFromSource(sourceValue: string): string | null {
  const parsed = parsePaSource(sourceValue);
  if (!parsed) {
    return null;
  }

  const rows = db.prepare(
    `SELECT COALESCE("IDCLUB", '') AS "IDCLUB"
     FROM "PARTICIP"
     WHERE "TUCLEUNIK" = ?
       AND COALESCE("GROUPE", '') = ?
       AND COALESCE("PAClassement", 0) = ?`,
  ).all(parsed.tourId, parsed.groupName, parsed.rank) as Array<Record<string, unknown>>;

  const resolved = Array.from(new Set(rows.map((row) => toText(row.IDCLUB)).filter((value) => value.length > 0)));
  if (resolved.length !== 1) {
    return null;
  }

  return resolved[0];
}

function isTourCompleted(tourId: number): boolean {
  if (!Number.isInteger(tourId) || tourId <= 0) {
    return false;
  }

  const tour = db.prepare(
    `SELECT COALESCE("NB_MATCH", 0) AS "NB_MATCH"
     FROM "TOUR"
     WHERE "TUCLEUNIK" = ?
     LIMIT 1`,
  ).get(tourId) as Record<string, unknown> | undefined;

  const expectedMatches = toInt(tour?.NB_MATCH, 0);
  if (expectedMatches <= 0) {
    return false;
  }

  const counters = db.prepare(
    `SELECT
       COUNT(*) AS "TOTAL",
       SUM(CASE WHEN COALESCE("ETAT", 0) = 3 THEN 1 ELSE 0 END) AS "DONE"
     FROM "RENCO"
     WHERE "TUCLEUNIK" = ?`,
  ).get(tourId) as Record<string, unknown> | undefined;

  const total = toInt(counters?.TOTAL, 0);
  const done = toInt(counters?.DONE, 0);

  if (total < expectedMatches) {
    return false;
  }

  return done >= expectedMatches && total === done;
}

function getSourceTourMeta(tourId: number, cache: Map<number, SourceTourMeta>): SourceTourMeta {
  const cached = cache.get(tourId);
  if (cached) {
    return cached;
  }

  const row = db.prepare(
    `SELECT
       COALESCE(td."TDTYPETOUR", 1) AS "TYPE_ID",
       COALESCE(td."ALLER_RETOUR", 0) AS "ALLER_RETOUR"
     FROM "TOUR" t
     LEFT JOIN "TOURDEF" td ON td."TDCLEUNIK" = t."TDCLEUNIK"
     WHERE t."TUCLEUNIK" = ?
     LIMIT 1`,
  ).get(tourId) as Record<string, unknown> | undefined;

  const meta: SourceTourMeta = {
    typeId: toInt(row?.TYPE_ID, 1),
    allerRetour: toInt(row?.ALLER_RETOUR, 0),
  };

  cache.set(tourId, meta);
  return meta;
}

function parseEliminatoireGroupParticipantIds(groupName: string): { leftParticipantId: number; rightParticipantId: number } | null {
  const raw = toText(groupName);
  if (!raw) {
    return null;
  }

  const match = raw.match(/^(\d+)\s*vs\s*(\d+)$/i);
  if (!match) {
    return null;
  }

  const leftParticipantId = toInt(match[1], 0);
  const rightParticipantId = toInt(match[2], 0);
  if (!Number.isInteger(leftParticipantId) || leftParticipantId <= 0 || !Number.isInteger(rightParticipantId) || rightParticipantId <= 0) {
    return null;
  }

  return { leftParticipantId, rightParticipantId };
}

function resolveParticipantClubIdForEliminatoireParticipant(participant: Record<string, unknown>): string {
  const directClubId = toText(participant.IDCLUB);
  if (directClubId) {
    return directClubId;
  }

  const nestedSource = toText(participant.PASource);
  if (!nestedSource) {
    return '';
  }

  return resolveProgrammedClubIdFromSource(nestedSource) ?? '';
}

function isEliminatoireSourceDuelCompleted(
  source: PaSourceRef,
  allerRetour: number,
): boolean {
  const pair = parseEliminatoireGroupParticipantIds(source.groupName);
  if (!pair) {
    return false;
  }

  const participants = db.prepare(
    `SELECT
       "PACLEUNIK",
       COALESCE("IDCLUB", '') AS "IDCLUB",
       COALESCE("PASource", '') AS "PASource"
     FROM "PARTICIP"
     WHERE "TUCLEUNIK" = ?
       AND "PACLEUNIK" IN (?, ?)`,
  ).all(source.tourId, pair.leftParticipantId, pair.rightParticipantId) as Array<Record<string, unknown>>;

  if (participants.length < 2) {
    return false;
  }

  const leftParticipant = participants.find((row) => toInt(row.PACLEUNIK, 0) === pair.leftParticipantId);
  const rightParticipant = participants.find((row) => toInt(row.PACLEUNIK, 0) === pair.rightParticipantId);
  if (!leftParticipant || !rightParticipant) {
    return false;
  }

  const leftClubId = resolveParticipantClubIdForEliminatoireParticipant(leftParticipant);
  const rightClubId = resolveParticipantClubIdForEliminatoireParticipant(rightParticipant);
  if (!leftClubId || !rightClubId) {
    return false;
  }

  const requiredCompletedMatches = allerRetour === 1 ? 2 : 1;
  const counters = db.prepare(
    `SELECT
       COUNT(*) AS "TOTAL",
       SUM(CASE WHEN COALESCE("ETAT", 0) = 3 THEN 1 ELSE 0 END) AS "DONE"
     FROM "RENCO"
     WHERE "TUCLEUNIK" = ?
       AND (
         (COALESCE("DOMICILE", '') = ? AND COALESCE("EXTERIEUR", '') = ?)
         OR
         (COALESCE("DOMICILE", '') = ? AND COALESCE("EXTERIEUR", '') = ?)
       )`,
  ).get(source.tourId, leftClubId, rightClubId, rightClubId, leftClubId) as Record<string, unknown> | undefined;

  const total = toInt(counters?.TOTAL, 0);
  const done = toInt(counters?.DONE, 0);
  if (total < requiredCompletedMatches) {
    return false;
  }

  return done >= requiredCompletedMatches;
}

function canResolveSourceForPropagation(sourceValue: string, metaCache: Map<number, SourceTourMeta>): boolean {
  const parsed = parsePaSource(sourceValue);
  if (!parsed) {
    return false;
  }

  const sourceTourMeta = getSourceTourMeta(parsed.tourId, metaCache);

  // Ligue: keep existing global completion rule at tour level.
  if (sourceTourMeta.typeId === 1) {
    return isTourCompleted(parsed.tourId);
  }

  // Eliminatoire: readiness is based on the referenced duel completion.
  if (sourceTourMeta.typeId === 2) {
    const duelCompleted = isEliminatoireSourceDuelCompleted(parsed, sourceTourMeta.allerRetour);
    if (duelCompleted) {
      return true;
    }

    // Fallback for unexpected source format in eliminatoire tours.
    return isTourCompleted(parsed.tourId);
  }

  return isTourCompleted(parsed.tourId);
}

function propagateProgrammedParticipantsAndMatches(): void {
  const sourceTourMetaCache = new Map<number, SourceTourMeta>();
  const unresolved = db.prepare(
    `SELECT
       "PACLEUNIK",
       "TUCLEUNIK",
       COALESCE("PASource", '') AS "PASource"
     FROM "PARTICIP"
     WHERE COALESCE("PASource", '') <> ''
       AND ("IDCLUB" IS NULL OR TRIM(COALESCE("IDCLUB", '')) = '')
     ORDER BY "PACLEUNIK" ASC`,
  ).all() as Array<Record<string, unknown>>;

  const resolvedSources = new Set<string>();

  unresolved.forEach((row) => {
    const paSource = toText(row.PASource);
    if (!canResolveSourceForPropagation(paSource, sourceTourMetaCache)) {
      return;
    }

    const resolvedClubId = resolveProgrammedClubIdFromSource(paSource);
    if (!resolvedClubId) {
      return;
    }

    db.prepare(
      `UPDATE "PARTICIP"
       SET "IDCLUB" = ?
       WHERE "PACLEUNIK" = ?`,
    ).run(resolvedClubId, toInt(row.PACLEUNIK));

    resolvedSources.add(paSource);
  });

  resolvedSources.forEach((source) => {
    const resolvedClubId = resolveProgrammedClubIdFromSource(source);
    if (!resolvedClubId) {
      return;
    }

    db.prepare(
      `UPDATE "RENCO"
       SET "DOMICILE" = ?
       WHERE COALESCE("PADOMSource", '') = ?
         AND TRIM(COALESCE("DOMICILE", '')) = ''`,
    ).run(resolvedClubId, source);

    db.prepare(
      `UPDATE "RENCO"
       SET "EXTERIEUR" = ?
       WHERE COALESCE("PAEXTSource", '') = ?
         AND TRIM(COALESCE("EXTERIEUR", '')) = ''`,
    ).run(resolvedClubId, source);
  });

  db.prepare(
    `UPDATE "RENCO"
     SET "ETAT" = 1
     WHERE COALESCE("ETAT", 0) = 5
       AND TRIM(COALESCE("DOMICILE", '')) <> ''
       AND TRIM(COALESCE("EXTERIEUR", '')) <> ''`,
  ).run();
}

function resolveMatchSideDisplayName(
  clubIdValue: unknown,
  sourceValue: unknown,
  fallbackValue: unknown,
  candidateCache: Map<string, string[]>,
  clubNameCache: Map<string, string>,
): string {
  const clubId = toText(clubIdValue);
  if (clubId) {
    return getClubNameById(clubId, clubNameCache);
  }

  const source = toText(sourceValue);
  if (source) {
    const candidates = resolveProgrammedCandidatesFromSource(source, new Set(), candidateCache, clubNameCache);
    if (candidates.length > 0) {
      return candidates.join('/');
    }
    return `Programme (${source})`;
  }

  return toText(fallbackValue);
}

function normalizeClubIdentifier(value: unknown): string {
  const raw = toText(value);
  if (!raw) return '';
  if (/^\d+$/.test(raw)) {
    return String(Number(raw));
  }
  return raw.toUpperCase();
}

function getSupportedClubId(): string {
  return getSupportedClubIdFromEnv();
}

function resolveSupportedClubSide(
  domicileClubId: string,
  exterieurClubId: string,
  supportedClubId: string,
): SupportedClubSide {
  const normalizedSupported = normalizeClubIdentifier(supportedClubId);
  const normalizedDom = normalizeClubIdentifier(domicileClubId);
  const normalizedExt = normalizeClubIdentifier(exterieurClubId);

  if (normalizedSupported && normalizedSupported === normalizedDom) {
    return 'home';
  }
  if (normalizedSupported && normalizedSupported === normalizedExt) {
    return 'away';
  }
  return 'none';
}

function resolvePlayerDisplayName(prenom: unknown, nom: unknown, fallbackId: unknown): string {
  const prenomText = toText(prenom);
  const nomText = toText(nom);
  const full = [prenomText, nomText].filter(Boolean).join(' ');
  if (full) return full;
  return toText(fallbackId);
}

function buildSupportedEventText(eventRow: Record<string, unknown>): string {
  const comment = toText(eventRow.COMMENT);
  const adversaire = toInt(eventRow.ADVERSAIRE, 0) === 1;

  const typeEvent = toInt(eventRow.TYPE_EVENT, 0);
  const periode = toInt(eventRow.PERIODE, 0);

  if (adversaire) {
    let baseText = '';
    if (typeEvent === 1) {
      baseText = 'But de';
    } else if (typeEvent === 2) {
      return comment;
    } else if (typeEvent === 3) {
      baseText = 'Carton jaune pour';
    } else if (typeEvent === 4) {
      baseText = 'Second carton jaune et expulsion pour';
    } else if (typeEvent === 5) {
      baseText = 'Carton rouge pour';
    } else if (typeEvent === 6) {
      baseText = 'Penalty sifflé pour';
    } else if (typeEvent === 7) {
      baseText = periode === 5 ? 'Tir au but marqué par' : 'Penalty marqué par';
    } else if (typeEvent === 8) {
      baseText = periode === 5 ? 'Tir au but manqué par' : 'Penalty manqué par';
    } else if (typeEvent === 9) {
      baseText = 'Blessure de';
    }
    return comment ? (baseText ? `${baseText} ${comment}` : comment) : baseText;
  }

  const joueur1 = resolvePlayerDisplayName(eventRow.J1_PRENOM, eventRow.J1_NOM, eventRow.JOUEUR1);
  const joueur2 = resolvePlayerDisplayName(eventRow.J2_PRENOM, eventRow.J2_NOM, eventRow.JOUEUR2);

  let baseText = '';
  if (typeEvent === 1) {
    baseText = joueur2 ? `But de ${joueur1} sur une passe de ${joueur2}` : `But de ${joueur1}`;
  } else if (typeEvent === 2) {
    baseText = `${joueur2} remplace ${joueur1}`;
  } else if (typeEvent === 3) {
    baseText = `Carton jaune pour ${joueur1}`;
  } else if (typeEvent === 4) {
    baseText = `Second carton jaune et expulsion pour ${joueur1}`;
  } else if (typeEvent === 5) {
    baseText = `Carton rouge pour ${joueur1}`;
  } else if (typeEvent === 6) {
    baseText = 'Penalty siffle';
  } else if (typeEvent === 7) {
    baseText = periode === 5
      ? `Tir au but marque par ${joueur1}`
      : `Penalty marque par ${joueur1}`;
  } else if (typeEvent === 8) {
    baseText = periode === 5
      ? `Tir au but manque par ${joueur1}`
      : `Penalty manque par ${joueur1}`;
  } else if (typeEvent === 9) {
    baseText = `${joueur1} sort sur blessure`;
  } else {
    baseText = 'Evenement';
  }

  if (comment) {
    return `${baseText} ${comment}`;
  }
  return baseText;
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
      td."VALEUR_BONUS_D",
      td."TDCLEFTRI"
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
    TDCLEFTRI: toText(row.TDCLEFTRI),
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

function readParticipantByTourAndMatchSide(
  tourId: number,
  clubId: string,
  sourceValue: string,
): { PACLEUNIK: number; GROUPE: string } | undefined {
  const source = toText(sourceValue);
  if (source) {
    const rowBySource = db.prepare(
      `SELECT
         "PACLEUNIK",
         COALESCE("GROUPE", '') AS "GROUPE"
       FROM "PARTICIP"
       WHERE "TUCLEUNIK" = ?
         AND COALESCE("PASource", '') = ?
       ORDER BY "PACLEUNIK" ASC
       LIMIT 1`,
    ).get(tourId, source) as Record<string, unknown> | undefined;

    if (rowBySource) {
      const participantId = toInt(rowBySource.PACLEUNIK, 0);
      if (Number.isInteger(participantId) && participantId > 0) {
        return {
          PACLEUNIK: participantId,
          GROUPE: toText(rowBySource.GROUPE),
        };
      }
    }
  }

  const normalizedClubId = toText(clubId);
  if (!normalizedClubId) {
    return undefined;
  }

  const rowByClub = db.prepare(
    `SELECT
       "PACLEUNIK",
       COALESCE("GROUPE", '') AS "GROUPE"
     FROM "PARTICIP"
     WHERE "TUCLEUNIK" = ?
       AND "IDCLUB" = ?
     ORDER BY "PACLEUNIK" ASC
     LIMIT 1`,
  ).get(tourId, normalizedClubId) as Record<string, unknown> | undefined;

  if (!rowByClub) {
    return undefined;
  }

  const participantId = toInt(rowByClub.PACLEUNIK, 0);
  if (!Number.isInteger(participantId) || participantId <= 0) {
    return undefined;
  }

  return {
    PACLEUNIK: participantId,
    GROUPE: toText(rowByClub.GROUPE),
  };
}

function isEliminatoireTour(tourId: number): boolean {
  const row = db.prepare(
    `SELECT COALESCE(td."TDTYPETOUR", 1) AS "TYPE_ID"
     FROM "TOUR" t
     LEFT JOIN "TOURDEF" td ON td."TDCLEUNIK" = t."TDCLEUNIK"
     WHERE t."TUCLEUNIK" = ?
     LIMIT 1`,
  ).get(tourId) as Record<string, unknown> | undefined;

  return toInt(row?.TYPE_ID, 1) === 2;
}

function isGeneratedMatchGroupLabel(groupName: string): boolean {
  return /^Match\s+\d+$/i.test(toText(groupName));
}

function buildNextEliminatoireMatchGroupLabel(tourId: number): string {
  const rows = db.prepare(
    `SELECT COALESCE("GROUPE", '') AS "GROUPE"
     FROM "PARTICIP"
     WHERE "TUCLEUNIK" = ?`,
  ).all(tourId) as Array<Record<string, unknown>>;

  let maxIndex = 0;
  rows.forEach((row) => {
    const groupName = toText(row.GROUPE);
    const match = /^Match\s+(\d+)$/i.exec(groupName);
    if (!match) {
      return;
    }
    const index = toInt(match[1], 0);
    if (index > maxIndex) {
      maxIndex = index;
    }
  });

  const nextIndex = maxIndex + 1;
  return `Match ${String(nextIndex).padStart(2, '0')}`;
}

function assignEliminatoireGroupForMatch(
  tourId: number,
  domicile: string,
  exterieur: string,
  domicileSource: string,
  exterieurSource: string,
): void {
  if (!isEliminatoireTour(tourId)) {
    return;
  }

  const homeClubId = toText(domicile);
  const awayClubId = toText(exterieur);
  const homeSource = toText(domicileSource);
  const awaySource = toText(exterieurSource);
  if (!homeClubId && !homeSource) {
    return;
  }
  if (!awayClubId && !awaySource) {
    return;
  }
  if (homeClubId && awayClubId && homeClubId === awayClubId) {
    return;
  }

  const homeParticipant = readParticipantByTourAndMatchSide(tourId, homeClubId, homeSource);
  const awayParticipant = readParticipantByTourAndMatchSide(tourId, awayClubId, awaySource);
  if (!homeParticipant || !awayParticipant) {
    return;
  }
  if (homeParticipant.PACLEUNIK === awayParticipant.PACLEUNIK) {
    return;
  }

  const homeGroup = toText(homeParticipant.GROUPE);
  const awayGroup = toText(awayParticipant.GROUPE);
  if (homeGroup && awayGroup) {
    return;
  }

  const nextGroup = homeGroup || awayGroup || buildNextEliminatoireMatchGroupLabel(tourId);
  if (!nextGroup) {
    return;
  }

  if (!homeGroup) {
    db.prepare(
      `UPDATE "PARTICIP"
       SET "GROUPE" = ?
       WHERE "PACLEUNIK" = ?`,
    ).run(nextGroup, homeParticipant.PACLEUNIK);
  }

  if (!awayGroup) {
    db.prepare(
      `UPDATE "PARTICIP"
       SET "GROUPE" = ?
       WHERE "PACLEUNIK" = ?`,
    ).run(nextGroup, awayParticipant.PACLEUNIK);
  }
}

function clearEliminatoireGroupForMatchIfUnused(tourId: number, domicile: string, exterieur: string): void {
  if (!isEliminatoireTour(tourId)) {
    return;
  }

  const homeClubId = toText(domicile);
  const awayClubId = toText(exterieur);
  if (!homeClubId || !awayClubId || homeClubId === awayClubId) {
    return;
  }

  const remainingMatch = db.prepare(
    `SELECT 1
     FROM "RENCO"
     WHERE "TUCLEUNIK" = ?
       AND (
         (COALESCE("DOMICILE", '') = ? AND COALESCE("EXTERIEUR", '') = ?)
         OR
         (COALESCE("DOMICILE", '') = ? AND COALESCE("EXTERIEUR", '') = ?)
       )
     LIMIT 1`,
  ).get(tourId, homeClubId, awayClubId, awayClubId, homeClubId) as Record<string, unknown> | undefined;

  if (remainingMatch) {
    return;
  }

  const homeParticipant = readParticipantByTourAndClub(tourId, homeClubId);
  const awayParticipant = readParticipantByTourAndClub(tourId, awayClubId);
  if (!homeParticipant || !awayParticipant) {
    return;
  }

  const homeGroup = toText(homeParticipant.GROUPE);
  const awayGroup = toText(awayParticipant.GROUPE);
  const canClear = homeGroup && awayGroup && homeGroup === awayGroup && isGeneratedMatchGroupLabel(homeGroup);
  if (!canClear) {
    return;
  }

  db.prepare(
    `UPDATE "PARTICIP"
     SET "GROUPE" = ''
     WHERE "TUCLEUNIK" = ? AND "IDCLUB" IN (?, ?)`,
  ).run(tourId, homeClubId, awayClubId);
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

const DEFAULT_SORT_CRITERIA: ParticipantSortCriterion[] = [{ direction: '-', field: 'PANbPoints' }];

function hasParticipantStatsField(field: string): field is keyof ParticipantStats {
  const sample = createEmptyParticipantStats('__sample__');
  return Object.prototype.hasOwnProperty.call(sample, field);
}

function parseParticipantSortCriteria(raw: string): ParticipantSortCriterion[] {
  const lines = String(raw ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const parsed: ParticipantSortCriterion[] = [];

  for (const line of lines) {
    const match = line.match(/^([+-]).*\t\s*([A-Za-z0-9_]+)\s*$/);
    if (!match) continue;

    const direction = match[1] as SortDirection;
    const field = match[2].trim();
    if (!hasParticipantStatsField(field)) continue;
    if (field === 'IDCLUB') continue;

    parsed.push({ direction, field });
  }

  if (parsed.length === 0) {
    return DEFAULT_SORT_CRITERIA;
  }

  return parsed;
}

function compareParticipantsByCriteria(
  a: ParticipantStats,
  b: ParticipantStats,
  criteria: ParticipantSortCriterion[],
): number {
  for (const criterion of criteria) {
    const left = toNum(a[criterion.field]);
    const right = toNum(b[criterion.field]);
    if (left === right) continue;
    if (criterion.direction === '-') {
      return right - left;
    }
    return left - right;
  }
  return 0;
}

export function sortParticipantsByPointsDesc(
  rows: ParticipantStats[],
  criteria: ParticipantSortCriterion[] = DEFAULT_SORT_CRITERIA,
): ParticipantStats[] {
  return [...rows].sort((a, b) => {
    const compare = compareParticipantsByCriteria(a, b, criteria);
    if (compare !== 0) {
      return compare;
    }
    return a.IDCLUB.localeCompare(b.IDCLUB, 'fr', { sensitivity: 'base' });
  });
}

function writeParticipantStats(
  tourId: number,
  groupName: string,
  rankedRows: ParticipantStats[],
  criteria: ParticipantSortCriterion[],
): void {
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

  let previous: ParticipantStats | null = null;
  let currentRank = 1;

  rankedRows.forEach((row, index) => {
    if (previous == null) {
      currentRank = 1;
    } else if (compareParticipantsByCriteria(previous, row, criteria) !== 0) {
      currentRank = index + 1;
    }

    updateStmt.run(
      currentRank,
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

    previous = row;
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
  const criteria = parseParticipantSortCriteria(rules.TDCLEFTRI);
  const ranked = sortParticipantsByPointsDesc(finalized, criteria);
  writeParticipantStats(tourId, groupName, ranked, criteria);
}

function recomputeAllGroupsForTour(tourId: number): void {
  if (!Number.isInteger(tourId) || tourId <= 0) {
    return;
  }

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
  const paDomSource = toText(body.PADOMSource);
  const paExtSource = toText(body.PAEXTSource);
  const tourId = toInt(body.TUCLEUNIK);

  if (!domicile && !paDomSource) {
    throw new AppError(400, 'DOMICILE ou PADOMSource est requis.');
  }
  if (!exterieur && !paExtSource) {
    throw new AppError(400, 'EXTERIEUR ou PAEXTSource est requis.');
  }

  if (domicile && exterieur && domicile === exterieur) {
    throw new AppError(400, 'DOMICILE et EXTERIEUR doivent etre differents.');
  }

  if (paDomSource && paExtSource && paDomSource === paExtSource) {
    throw new AppError(400, 'PADOMSource et PAEXTSource doivent etre differents.');
  }

  if (!Number.isInteger(tourId) || tourId < 0) {
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

    assignEliminatoireGroupForMatch(
      insertedRow.TUCLEUNIK,
      insertedRow.DOMICILE,
      insertedRow.EXTERIEUR,
      insertedRow.PADOMSource ?? '',
      insertedRow.PAEXTSource ?? '',
    );

    propagateProgrammedParticipantsAndMatches();
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

  const normalizedBody = {
    ...body,
    ...(Object.prototype.hasOwnProperty.call(body, 'IDCIRC') && body.IDCIRC == null
      ? { IDCIRC: '' }
      : {}),
  };
  const keys = Object.keys(normalizedBody);
  if (keys.length === 0) {
    throw new AppError(400, 'No fields provided');
  }

  const transaction = db.transaction(() => {
    const beforeRow = readRencontreRowById(rencontreId);
    if (!beforeRow) {
      return false;
    }

    const sets = keys.map((c) => `"${c}" = ?`).join(', ');
    db.prepare(`UPDATE "RENCO" SET ${sets} WHERE "RECLEUNIK" = ?`).run(...Object.values(normalizedBody) as [], rencontreId);

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

    propagateProgrammedParticipantsAndMatches();

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
    clearEliminatoireGroupForMatchIfUnused(row.TUCLEUNIK, row.DOMICILE, row.EXTERIEUR);
    propagateProgrammedParticipantsAndMatches();
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
  const rows = await dbAll<CalendarMatchRow & { PADOMSource?: string | null; PAEXTSource?: string | null }>(
    `SELECT
      r.RECLEUNIK,
      r.TUCLEUNIK,
      COALESCE(td.TDTYPETOUR, 1) AS TYPE_TOUR,
      r.DATE,
      r.HEURE,
      r.ETAT,
      r.IDCIRC,
      c.CIRC,
      COALESCE(t.NOM, '') AS TOUR_NOM,
      COALESCE(co.NOM, '') AS COMPET_NOM,
      co.COCLEUNIK,
      NULLIF(TRIM(COALESCE(co.CO_WEB, '')), '') AS CO_WEB,
      COALESCE(co.SAISON, r.SAISON, '') AS SAISON,
      COALESCE(co.CO_ANNEE, 0) AS CO_ANNEE,
      r.DOMICILE,
      r.EXTERIEUR,
      r.BUTDOM,
      r.BUTEXT,
      r.TABDOM,
      r.TABEXT,
      r.PADOMSource,
      r.PAEXTSource,
      COALESCE(cd.CLUB, r.DOMICILE) AS DOMICILE_NOM,
      COALESCE(ce.CLUB, r.EXTERIEUR) AS EXTERIEUR_NOM
     FROM RENCO r
         LEFT JOIN CIRC c ON c.IDCIRC = r.IDCIRC
         LEFT JOIN TOUR t ON t.TUCLEUNIK = r.TUCLEUNIK
         LEFT JOIN TOURDEF td ON td.TDCLEUNIK = t.TDCLEUNIK
         LEFT JOIN COMPET co ON co.COCLEUNIK = t.COCLEUNIK
     LEFT JOIN CLUB cd ON cd.IDCLUB = r.DOMICILE
     LEFT JOIN CLUB ce ON ce.IDCLUB = r.EXTERIEUR
     WHERE r.DATE = ?
     ORDER BY r.HEURE ASC, r.RECLEUNIK ASC`,
    [date],
  );

  const candidateCache = new Map<string, string[]>();
  const clubNameCache = new Map<string, string>();

  return rows.map((row) => ({
    ...row,
    DOMICILE_NOM: resolveMatchSideDisplayName(
      row.DOMICILE,
      row.PADOMSource,
      row.DOMICILE_NOM,
      candidateCache,
      clubNameCache,
    ),
    EXTERIEUR_NOM: resolveMatchSideDisplayName(
      row.EXTERIEUR,
      row.PAEXTSource,
      row.EXTERIEUR_NOM,
      candidateCache,
      clubNameCache,
    ),
  }));
}

export async function getRencontreDetailById(id: string | number): Promise<RencontreDetailRow | undefined> {
  return dbAll<Omit<RencontreDetailRow, 'SUPPORTED_CLUB_ID' | 'IS_SUPPORTED_CLUB_MATCH' | 'SUPPORTED_CLUB_SIDE'>>(
    `SELECT
      r.RECLEUNIK,
      m.MACLEUNIK,
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
      ), COALESCE(cd.CLUB, ''), '') AS DOMICILE_NOM_COMPLET,
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
      ), COALESCE(ce.CLUB, ''), '') AS EXTERIEUR_NOM_COMPLET,
      NULLIF(TRIM(COALESCE(m.IDARBITRE, '')), '') AS IDARBITRE,
      COALESCE(a.NOM, '') AS ARBITRE_NOM,
      COALESCE(a.PRENOM, '') AS ARBITRE_PRENOM,
      NULLIF(TRIM(COALESCE(m.TECLEUNIK, '')), '') AS TECLEUNIK,
      COALESCE(te.STADE, '') AS TERRAIN_NOM,
      COALESCE(vt.NOM, '') AS TERRAIN_VILLE,
      COALESCE(m.NBSPECT, 0) AS NBSPECT
     FROM RENCO r
     LEFT JOIN MATCH m ON m.RECLEUNIK = r.RECLEUNIK
     LEFT JOIN TOUR t ON t.TUCLEUNIK = r.TUCLEUNIK
     LEFT JOIN TOURDEF td ON td.TDCLEUNIK = t.TDCLEUNIK
     LEFT JOIN CLUB cd ON cd.IDCLUB = r.DOMICILE
     LEFT JOIN CLUB ce ON ce.IDCLUB = r.EXTERIEUR
     LEFT JOIN ARBITRE a ON a.IDARBITRE = m.IDARBITRE
     LEFT JOIN TERRAIN te ON te.TECLEUNIK = m.TECLEUNIK
    LEFT JOIN VILLE vt ON vt.VICLEUNIK = te.IDVILLE
     WHERE r.RECLEUNIK = ?
     LIMIT 1`,
    [id],
  ).then((rows) => {
    const detail = rows[0];
    if (!detail) {
      return undefined;
    }

    const candidateCache = new Map<string, string[]>();
    const clubNameCache = new Map<string, string>();

    const domicileEffectiveName = resolveMatchSideDisplayName(
      detail.DOMICILE,
      detail.PADOMSource,
      detail.DOMICILE_NOM_COMPLET,
      candidateCache,
      clubNameCache,
    );

    const exterieurEffectiveName = resolveMatchSideDisplayName(
      detail.EXTERIEUR,
      detail.PAEXTSource,
      detail.EXTERIEUR_NOM_COMPLET,
      candidateCache,
      clubNameCache,
    );

    const supportedClubId = getSupportedClubId();
    const supportedSide = resolveSupportedClubSide(detail.DOMICILE, detail.EXTERIEUR, supportedClubId);
    let terrainId = toText(detail.TECLEUNIK);
    let terrainName = toText(detail.TERRAIN_NOM);
    let terrainVille = toText(detail.TERRAIN_VILLE);

    if (!terrainId && supportedSide !== 'none') {
      const defaultTerrain = getLatestTerrainForClub(toText(detail.DOMICILE));
      if (defaultTerrain) {
        terrainId = defaultTerrain.TERRAIN_ID;
        terrainName = defaultTerrain.TERRAIN_NOM;
        terrainVille = defaultTerrain.TERRAIN_VILLE;
      }
    }

    const opponentClubId = supportedSide === 'home'
      ? toText(detail.EXTERIEUR)
      : supportedSide === 'away'
        ? toText(detail.DOMICILE)
        : '';
    const isSupportedClubTerrain = terrainId ? clubHasTerrain(supportedClubId, terrainId) : false;
    const isOpponentClubTerrain = terrainId && opponentClubId ? clubHasTerrain(opponentClubId, terrainId) : false;
    const terrainDisplay = terrainName && !isSupportedClubTerrain && !isOpponentClubTerrain && terrainVille
      ? `${terrainName} (${terrainVille})`
      : terrainName;

    return {
      ...detail,
      TECLEUNIK: terrainId || null,
      TERRAIN_NOM: terrainName,
      TERRAIN_VILLE: terrainVille,
      DOMICILE_NOM_EFFECTIF: domicileEffectiveName,
      EXTERIEUR_NOM_EFFECTIF: exterieurEffectiveName,
      TERRAIN_DISPLAY: terrainDisplay,
      SUPPORTED_CLUB_ID: supportedClubId,
      IS_SUPPORTED_CLUB_MATCH: supportedSide === 'none' ? 0 : 1,
      SUPPORTED_CLUB_SIDE: supportedSide,
    };
  });
}

export async function getRencontreHighlightsById(id: string | number): Promise<RencontreHighlightsRow | undefined> {
  const recleunik = toInt(id);
  if (!Number.isInteger(recleunik) || recleunik <= 0) {
    throw new AppError(400, 'Identifiant de rencontre invalide.');
  }

  const baseRow = db.prepare(
    `SELECT
      r."RECLEUNIK",
      r."DOMICILE",
      r."EXTERIEUR",
      m."MACLEUNIK"
     FROM "RENCO" r
     LEFT JOIN "MATCH" m ON m."RECLEUNIK" = r."RECLEUNIK"
     WHERE r."RECLEUNIK" = ?
     LIMIT 1`,
  ).get(recleunik) as Record<string, unknown> | undefined;

  if (!baseRow) {
    return undefined;
  }

  const domicile = toText(baseRow.DOMICILE);
  const exterieur = toText(baseRow.EXTERIEUR);
  const macleunik = baseRow.MACLEUNIK == null ? null : toInt(baseRow.MACLEUNIK);
  const supportedClubId = getSupportedClubId();
  const supportedSide = resolveSupportedClubSide(domicile, exterieur, supportedClubId);

  if (!macleunik) {
    return {
      RECLEUNIK: recleunik,
      MACLEUNIK: null,
      SUPPORTED_CLUB_ID: supportedClubId,
      IS_SUPPORTED_CLUB_MATCH: supportedSide === 'none' ? 0 : 1,
      SUPPORTED_CLUB_SIDE: supportedSide,
      EVENTS: [],
    };
  }

  const eventsRaw = db.prepare(
    `SELECT
      e."EVCLEUNIK",
      e."MINUTE",
      e."PERIODE",
      e."TYPE_EVENT",
      e."ADVERSAIRE",
      e."JOUEUR1",
      e."JOUEUR2",
      e."COMMENT",
      j1."PRENOM" AS "J1_PRENOM",
      j1."NOM" AS "J1_NOM",
      j2."PRENOM" AS "J2_PRENOM",
      j2."NOM" AS "J2_NOM"
     FROM "EVENT" e
     LEFT JOIN "JOUEURRG" j1 ON j1."IDJOUEUR" = e."JOUEUR1"
     LEFT JOIN "JOUEURRG" j2 ON j2."IDJOUEUR" = e."JOUEUR2"
     WHERE e."MACLEUNIK" = ?
     ORDER BY e."PERIODE" ASC, e."MINUTE" ASC, e."EVCLEUNIK" ASC`,
  ).all(macleunik) as Array<Record<string, unknown>>;

  const events: RencontreHighlightEventRow[] = eventsRaw.map((row) => {
    const adversaire = toInt(row.ADVERSAIRE, 0) === 1;
    let side: 'home' | 'away' | null = null;
    if (supportedSide === 'home') {
      side = adversaire ? 'away' : 'home';
    } else if (supportedSide === 'away') {
      side = adversaire ? 'home' : 'away';
    }

    return {
      EVCLEUNIK: toInt(row.EVCLEUNIK),
      MINUTE: toInt(row.MINUTE),
      PERIODE: toInt(row.PERIODE),
      TYPE_EVENT: toInt(row.TYPE_EVENT),
      ADVERSAIRE: adversaire ? 1 : 0,
      JOUEUR1: row.JOUEUR1 == null ? null : toText(row.JOUEUR1),
      JOUEUR2: row.JOUEUR2 == null ? null : toText(row.JOUEUR2),
      COMMENT: row.COMMENT == null ? null : String(row.COMMENT),
      SIDE: side,
      TEXT: buildSupportedEventText(row),
    };
  });

  return {
    RECLEUNIK: recleunik,
    MACLEUNIK: macleunik,
    SUPPORTED_CLUB_ID: supportedClubId,
    IS_SUPPORTED_CLUB_MATCH: supportedSide === 'none' ? 0 : 1,
    SUPPORTED_CLUB_SIDE: supportedSide,
    EVENTS: events,
  };
}

export interface TourMatchWithNamesRow {
  RECLEUNIK: number;
  DATE: string;
  HEURE: string | null;
  DOMICILE: string;
  EXTERIEUR: string;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  ETAT: number;
  IDCIRC: string | null;
}

export async function getTourMatchesForRencontre(id: string | number): Promise<TourMatchWithNamesRow[]> {
  const recleunik = toInt(id);
  if (!Number.isInteger(recleunik) || recleunik <= 0) {
    throw new AppError(400, 'Identifiant de rencontre invalide.');
  }

  const rows = db.prepare(
    `SELECT
       r."RECLEUNIK",
       r."DATE",
       r."HEURE",
       r."DOMICILE",
       r."EXTERIEUR",
       r."BUTDOM",
       r."BUTEXT",
       r."TABDOM",
       r."TABEXT",
       r."ETAT",
       r."IDCIRC",
      r."PADOMSource",
      r."PAEXTSource",
       COALESCE(cd."CLUB", r."DOMICILE") AS "DOMICILE_NOM",
       COALESCE(ce."CLUB", r."EXTERIEUR") AS "EXTERIEUR_NOM"
     FROM "RENCO" r
     LEFT JOIN "CLUB" cd ON cd."IDCLUB" = r."DOMICILE"
     LEFT JOIN "CLUB" ce ON ce."IDCLUB" = r."EXTERIEUR"
     WHERE r."TUCLEUNIK" = (SELECT "TUCLEUNIK" FROM "RENCO" WHERE "RECLEUNIK" = ?)
       AND r."IDCIRC" IS (SELECT "IDCIRC" FROM "RENCO" WHERE "RECLEUNIK" = ?)
       AND r."RECLEUNIK" != ?
     ORDER BY r."DATE" ASC, r."HEURE" ASC, r."RECLEUNIK" ASC`,
  ).all(recleunik, recleunik, recleunik) as Array<Record<string, unknown>>;

  const candidateCache = new Map<string, string[]>();
  const clubNameCache = new Map<string, string>();

  return rows.map((row) => ({
    RECLEUNIK: toInt(row.RECLEUNIK),
    DATE: toText(row.DATE),
    HEURE: row.HEURE == null ? null : toText(row.HEURE),
    DOMICILE: toText(row.DOMICILE),
    EXTERIEUR: toText(row.EXTERIEUR),
    DOMICILE_NOM: resolveMatchSideDisplayName(
      row.DOMICILE,
      row.PADOMSource,
      row.DOMICILE_NOM,
      candidateCache,
      clubNameCache,
    ),
    EXTERIEUR_NOM: resolveMatchSideDisplayName(
      row.EXTERIEUR,
      row.PAEXTSource,
      row.EXTERIEUR_NOM,
      candidateCache,
      clubNameCache,
    ),
    BUTDOM: toInt(row.BUTDOM),
    BUTEXT: toInt(row.BUTEXT),
    TABDOM: toInt(row.TABDOM),
    TABEXT: toInt(row.TABEXT),
    ETAT: toInt(row.ETAT, 1) || 1,
    IDCIRC: row.IDCIRC == null ? null : toText(row.IDCIRC),
  }));
}

const COMPO_FIELDS = [
  'GOAL','DLG','DLD','DCG','DCD','LIB','STO',
  'MDLD','MDLG','MDCD','MDCG','MOLD','MOLG','MOCD','MOCG','MOCC','MDCC',
  'ALD','ALG','ACD','ACG','AVC',
  'REMP1','REMP2','REMP3','REMP4','REMP5','REMP6',
  'REMP7','REMP8','REMP9','REMP10','REMP11',
  'ENTRAINEUR',
] as const;

export interface CompositionRow {
  EQCLEUNIK: number | null;
  MACLEUNIK: number | null;
  [key: string]: unknown;
}

function ensureMatchRowForRencontre(recleunik: number): { macleunik: number; saison: string } {
  const matchRow = db.prepare(
    `SELECT m."MACLEUNIK", m."SAISON" FROM "MATCH" m WHERE m."RECLEUNIK" = ? LIMIT 1`,
  ).get(recleunik) as Record<string, unknown> | undefined;

  if (matchRow) {
    return {
      macleunik: toInt(matchRow.MACLEUNIK),
      saison: toText(matchRow.SAISON),
    };
  }

  const rencoRow = db.prepare(`SELECT "SAISON" FROM "RENCO" WHERE "RECLEUNIK" = ? LIMIT 1`)
    .get(recleunik) as Record<string, unknown> | undefined;

  if (!rencoRow) throw new AppError(404, 'Rencontre introuvable.');

  const inserted = db.prepare(
    `INSERT INTO "MATCH" ("RECLEUNIK", "SAISON", "NBSPECT", "CALCULE", "EXTRATIME", "PENALTY", "CLIMAT", "TV", "PELOUSE", "LIEU", "MADUREE")
     VALUES (?, ?, 0, 1, 0, 0, 0, 0, 0, 'N', 90)`,
  ).run(recleunik, toText(rencoRow.SAISON));

  return {
    macleunik: toInt(inserted.lastInsertRowid),
    saison: toText(rencoRow.SAISON),
  };
}

export async function upsertArbitreForRencontre(rencontreId: string | number, idarbitre: string | null): Promise<void> {
  const recleunik = toInt(rencontreId);
  if (!Number.isInteger(recleunik) || recleunik <= 0) throw new AppError(400, 'Identifiant de rencontre invalide.');

  const normalizedArbitre = idarbitre ? String(idarbitre).trim() || null : null;

  const { macleunik } = ensureMatchRowForRencontre(recleunik);
  db.prepare(`UPDATE "MATCH" SET "IDARBITRE" = ? WHERE "MACLEUNIK" = ?`)
    .run(normalizedArbitre, macleunik);
}

export interface RencontreMatchMetaPayload {
  IDARBITRE?: string | null;
  TECLEUNIK?: string | null;
  NBSPECT?: number;
  LIEU?: string | null;
}

interface ClubLatestTerrainRow {
  TERRAIN_ID: string;
  TERRAIN_NOM: string;
  TERRAIN_VILLE: string;
}

function getLatestTerrainForClub(clubId: string): ClubLatestTerrainRow | null {
  const normalizedClubId = toText(clubId);
  if (!normalizedClubId) {
    return null;
  }

  const row = db.prepare(
    `SELECT
       NULLIF(TRIM(CAST(ct."TECLEUNIK" AS TEXT)), '') AS TERRAIN_ID,
       COALESCE(t."STADE", '') AS TERRAIN_NOM,
       COALESCE(v."NOM", '') AS TERRAIN_VILLE
     FROM "CLUB_TERRAIN" ct
     LEFT JOIN "TERRAIN" t ON t."TECLEUNIK" = ct."TECLEUNIK"
     LEFT JOIN "VILLE" v ON v."VICLEUNIK" = t."IDVILLE"
     WHERE ct."IDCLUB" = ?
       AND NULLIF(TRIM(CAST(ct."TECLEUNIK" AS TEXT)), '') IS NOT NULL
     ORDER BY REPLACE(COALESCE(ct."DATE", ''), '-', '') DESC, ct."CT_CLEUNIK" DESC
     LIMIT 1`,
  ).get(normalizedClubId) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  const terrainId = toText(row.TERRAIN_ID);
  if (!terrainId) {
    return null;
  }

  return {
    TERRAIN_ID: terrainId,
    TERRAIN_NOM: toText(row.TERRAIN_NOM),
    TERRAIN_VILLE: toText(row.TERRAIN_VILLE),
  };
}

function clubHasTerrain(clubId: string, tecleunik: string): boolean {
  if (!clubId || !tecleunik) return false;
  const row = db.prepare(
    `SELECT 1
     FROM "CLUB_TERRAIN"
     WHERE "IDCLUB" = ? AND CAST("TECLEUNIK" AS TEXT) = ?
     LIMIT 1`,
  ).get(clubId, tecleunik) as Record<string, unknown> | undefined;
  return !!row;
}

function resolveMatchLieuFromTerrain(recleunik: number, tecleunik: string | null): 'D' | 'E' | 'N' {
  if (!tecleunik) return 'N';

  const rencontre = db.prepare(
    `SELECT "DOMICILE", "EXTERIEUR"
     FROM "RENCO"
     WHERE "RECLEUNIK" = ?
     LIMIT 1`,
  ).get(recleunik) as Record<string, unknown> | undefined;

  if (!rencontre) return 'N';

  const domicile = toText(rencontre.DOMICILE);
  const exterieur = toText(rencontre.EXTERIEUR);
  const supportedClubId = getSupportedClubId();
  const supportedSide = resolveSupportedClubSide(domicile, exterieur, supportedClubId);

  if (supportedSide === 'none') return 'N';

  const opponentClubId = supportedSide === 'home' ? exterieur : domicile;

  if (clubHasTerrain(supportedClubId, tecleunik)) {
    return 'D';
  }
  if (clubHasTerrain(opponentClubId, tecleunik)) {
    return 'E';
  }
  return 'N';
}

export async function upsertMatchMetaForRencontre(rencontreId: string | number, payload: RencontreMatchMetaPayload): Promise<void> {
  const recleunik = toInt(rencontreId);
  if (!Number.isInteger(recleunik) || recleunik <= 0) throw new AppError(400, 'Identifiant de rencontre invalide.');

  const { macleunik } = ensureMatchRowForRencontre(recleunik);
  const normalizedArbitre = payload.IDARBITRE == null ? null : (String(payload.IDARBITRE).trim() || null);
  const normalizedTerrain = payload.TECLEUNIK == null ? null : (String(payload.TECLEUNIK).trim() || null);
  const rawNbSpect = toInt(payload.NBSPECT, 0);
  const normalizedNbSpect = rawNbSpect === -1 ? -1 : Math.max(0, rawNbSpect);
  const normalizedLieu = resolveMatchLieuFromTerrain(recleunik, normalizedTerrain);

  db.prepare(
    `UPDATE "MATCH"
     SET "IDARBITRE" = ?, "TECLEUNIK" = ?, "NBSPECT" = ?, "LIEU" = ?
     WHERE "MACLEUNIK" = ?`,
  ).run(normalizedArbitre, normalizedTerrain, normalizedNbSpect, normalizedLieu, macleunik);
}

export async function getCompositionForRencontre(id: string | number): Promise<CompositionRow | null> {
  const recleunik = toInt(id);
  if (!Number.isInteger(recleunik) || recleunik <= 0) throw new AppError(400, 'Identifiant invalide.');

  const row = db.prepare(
    `SELECT e.*, m."RECLEUNIK", m."MACLEUNIK" AS "MATCH_MACLEUNIK", COALESCE(m."IDARBITRE", '') AS "IDARBITRE", COALESCE(m."MACOMPOADVERSAIRE", '') AS "MACOMPOADVERSAIRE"
     FROM "MATCH" m
     LEFT JOIN "EQUIPE" e ON e."MACLEUNIK" = m."MACLEUNIK"
     WHERE m."RECLEUNIK" = ? LIMIT 1`,
  ).get(recleunik) as Record<string, unknown> | undefined;

  if (!row) return null;
  return row as CompositionRow;
}

export async function upsertCompositionForRencontre(
  id: string | number,
  payload: Record<string, unknown>,
): Promise<CompositionRow | null> {
  const recleunik = toInt(id);
  if (!Number.isInteger(recleunik) || recleunik <= 0) throw new AppError(400, 'Identifiant invalide.');

  const matchRow = db.prepare(
    `SELECT m."MACLEUNIK", r."SAISON", r."DATE"
     FROM "MATCH" m INNER JOIN "RENCO" r ON r."RECLEUNIK" = m."RECLEUNIK"
     WHERE m."RECLEUNIK" = ? LIMIT 1`,
  ).get(recleunik) as Record<string, unknown> | undefined;

  if (!matchRow) throw new AppError(404, 'Match introuvable pour cette rencontre.');

  const macleunik = toInt(matchRow.MACLEUNIK);
  const saison = toText(matchRow.SAISON);
  const date = matchRow.DATE == null ? null : toText(matchRow.DATE);
  const opponentCompositionRaw = payload.MACOMPOADVERSAIRE;
  const opponentComposition = opponentCompositionRaw == null ? null : String(opponentCompositionRaw);
  const normalizedOpponentComposition = opponentComposition && opponentComposition.trim() ? opponentComposition : null;

  const existing = db.prepare('SELECT "EQCLEUNIK" FROM "EQUIPE" WHERE "MACLEUNIK" = ? LIMIT 1').get(macleunik) as Record<string, unknown> | undefined;

  const fieldsToSave: string[] = [];
  const values: unknown[] = [];
  for (const field of COMPO_FIELDS) {
    fieldsToSave.push(field);
    const val = payload[field];
    values.push(val === '' || val == null ? null : toText(val));
  }

  if (existing) {
    const sets = fieldsToSave.map((f) => `"${f}" = ?`).join(', ');
    db.prepare(`UPDATE "EQUIPE" SET ${sets} WHERE "MACLEUNIK" = ?`).run(...values, macleunik);
  } else {
    const cols = ['MACLEUNIK', 'SAISON', 'DATE', ...fieldsToSave].map((f) => `"${f}"`).join(', ');
    const marks = ['?', '?', '?', ...fieldsToSave.map(() => '?')].join(', ');
    db.prepare(`INSERT INTO "EQUIPE" (${cols}) VALUES (${marks})`).run(macleunik, saison, date, ...values);
  }

  db.prepare(`UPDATE "MATCH" SET "MACOMPOADVERSAIRE" = ? WHERE "MACLEUNIK" = ?`).run(normalizedOpponentComposition, macleunik);

  return getCompositionForRencontre(id);
}

export interface SquadPlayerRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  POSTE: number | null;
  POS_TYPE: number | null;
  IDNATIO: string | null;
}

export async function getSquadForRencontre(id: string | number): Promise<SquadPlayerRow[]> {
  const recleunik = toInt(id);
  if (!Number.isInteger(recleunik) || recleunik <= 0) throw new AppError(400, 'Identifiant invalide.');

  const rencoRow = db.prepare(
    `SELECT "SAISON", "DATE" FROM "RENCO" WHERE "RECLEUNIK" = ? LIMIT 1`,
  ).get(recleunik) as Record<string, unknown> | undefined;

  if (!rencoRow) return [];

  const saison = toText(rencoRow.SAISON);
  const matchDate = rencoRow.DATE == null ? null : toText(rencoRow.DATE);

  // A player is available if:
  // - they have no transactions at all (historical data), OR
  // - their last transaction across ALL seasons on/before the match date is not a departure (STATUT != 1)
  // STATUT=1=departure, STATUT=2=arrival, STATUT=3=contract/renewal
  const rows = db.prepare(
    `SELECT jr."IDJOUEUR", jr."NOM", jr."PRENOM", jr."SURNOM", jr."POSTE", p."POS_TYPE", jr."IDNATIO"
     FROM "JOUEURRG" jr
     INNER JOIN "JOUEUR" j ON j."IDJOUEUR" = jr."IDJOUEUR" AND j."SAISON" = ?
     INNER JOIN "Poste" p ON p."POS_ID" = j."POSTE" AND p."POS_TYPE" IN (1, 2)
     WHERE (
       NOT EXISTS (
         SELECT 1 FROM "TRANSAC" t WHERE t."IDJOUEUR" = jr."IDJOUEUR"
       )
       OR COALESCE((
         SELECT t_last."STATUT"
         FROM "TRANSAC" t_last
         WHERE t_last."IDJOUEUR" = jr."IDJOUEUR"
           AND t_last."DATE" <= ?
         ORDER BY t_last."DATE" DESC, t_last."TNCLEUNIK" DESC
         LIMIT 1
       ), 1) != 1
     )
     ORDER BY COALESCE(NULLIF(TRIM(jr."SURNOM"), ''), jr."NOM")`,
  ).all(saison, matchDate) as SquadPlayerRow[];

  return rows.map((row) => ({
    IDJOUEUR: toText(row.IDJOUEUR),
    NOM: toText(row.NOM),
    PRENOM: toText(row.PRENOM),
    SURNOM: row.SURNOM == null ? null : toText(row.SURNOM),
    POSTE: row.POSTE == null ? null : toInt(row.POSTE),
    POS_TYPE: row.POS_TYPE == null ? null : toInt(row.POS_TYPE as unknown),
    IDNATIO: row.IDNATIO == null ? null : toText(row.IDNATIO),
  }));
}

export interface EventPayload {
  adversaire: number;
  minute: number;
  periode: number;
  typeEvent: number;
  joueur1: string | null;
  joueur2: string | null;
  comment: string | null;
}

export async function createEventForRencontre(rencontreId: string | number, payload: EventPayload): Promise<void> {
  const recleunik = toInt(rencontreId);
  if (!Number.isInteger(recleunik) || recleunik <= 0) throw new AppError(400, 'Identifiant invalide.');

  const row = db.prepare(
    `SELECT m."MACLEUNIK", r."SAISON", r."DATE"
     FROM "MATCH" m INNER JOIN "RENCO" r ON r."RECLEUNIK" = m."RECLEUNIK"
     WHERE m."RECLEUNIK" = ? LIMIT 1`,
  ).get(recleunik) as Record<string, unknown> | undefined;

  if (!row) throw new AppError(404, 'Match introuvable pour cette rencontre.');

  db.prepare(
    `INSERT INTO "EVENT" ("MACLEUNIK","SAISON","DATE","MINUTE","PERIODE","TYPE_EVENT","ADVERSAIRE","JOUEUR1","JOUEUR2","COMMENT")
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    toInt(row.MACLEUNIK),
    toText(row.SAISON),
    row.DATE == null ? '' : toText(row.DATE),
    payload.minute,
    payload.periode,
    payload.typeEvent,
    payload.adversaire,
    payload.joueur1 || null,
    payload.joueur2 || null,
    payload.comment || null,
  );
}

export async function updateEventForRencontre(evcleunik: string | number, payload: EventPayload): Promise<void> {
  const id = toInt(evcleunik);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Identifiant invalide.');

  const result = db.prepare(
    `UPDATE "EVENT" SET "MINUTE"=?,"PERIODE"=?,"TYPE_EVENT"=?,"ADVERSAIRE"=?,"JOUEUR1"=?,"JOUEUR2"=?,"COMMENT"=?
     WHERE "EVCLEUNIK"=?`,
  ).run(
    payload.minute,
    payload.periode,
    payload.typeEvent,
    payload.adversaire,
    payload.joueur1 || null,
    payload.joueur2 || null,
    payload.comment || null,
    id,
  );

  if (result.changes === 0) throw new AppError(404, 'Événement introuvable.');
}

export async function deleteEventForRencontre(evcleunik: string | number): Promise<void> {
  const id = toInt(evcleunik);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Identifiant invalide.');

  const result = db.prepare(`DELETE FROM "EVENT" WHERE "EVCLEUNIK" = ?`).run(id);
  if (result.changes === 0) throw new AppError(404, 'Événement introuvable.');
}

export default {
  ...baseService,
  getCalendarByDate,
  getRencontreDetailById,
  getRencontreHighlightsById,
  getTourMatchesForRencontre,
  getCompositionForRencontre,
  upsertCompositionForRencontre,
  upsertArbitreForRencontre,
  upsertMatchMetaForRencontre,
  getSquadForRencontre,
  createEventForRencontre,
  updateEventForRencontre,
  deleteEventForRencontre,
  createWithImpact,
  updateWithImpact,
  removeWithImpact,
};





