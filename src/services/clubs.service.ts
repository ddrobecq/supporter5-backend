import { createEntityService } from '../lib/baseService';
import { buildCircCompletResolver } from '../lib/circComplet';
import { getLatestTerrainForClub } from '../lib/clubTerrain';
import db, { dbAll, dbGet, dbRun } from '../config/database';
import { levenshteinDistance, normalizeSearchText } from '../lib/searchUtils';
import { buildWhere, sanitizeSort } from '../lib/queryBuilder';
import { AppError, type PaginatedResult, type QueryParams } from '../types';

/** CLUB_NOM = historique des noms de clubs */
export interface ClubGridRow {
  IDCLUB: string;
  CLUB_ABREGE: string;
  CLUB_NOM_COMPLET: string;
  VILLE_NOM: string;
}

export interface ClubProfileRow {
  IDCLUB: string;
  CLUB_ABREGE: string;
  IDNATIO: string;
  IDVILLE: string | null;
  VILLE_NOM: string;
  VILLE_IDNATIO: string;
  FOND: string | null;
  TEXTE: string | null;
}

export interface ClubNameHistoryRow {
  IDCLUB_NOM: number;
  DATE: string | null;
  CN_ACTION: number;
  CN_NOM: string;
}

export interface ClubTerrainHistoryRow {
  CT_CLEUNIK: number;
  TECLEUNIK: number;
  DATE: string | null;
  STADE: string;
}

export interface ClubMatchRow {
  RECLEUNIK: number;
  DATE: string;
  CIRC_COMPLET: string;
  DOMICILE: string;
  EXTERIEUR: string;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  ETAT: number;
}

export interface ClubPalmareRow {
  IDEPREUVE: number;
  EPREUVE: string;
  OFFICIELLE: number;
  SCOPE: number;
  NB_TITRES: number;
  ANNEES: string[];
}

export interface ClubsGridResponse {
  data: ClubGridRow[];
}

export interface ClubSuggestionsResponse {
  data: ClubSuggestionRow[];
}

export interface ClubSuggestionRow {
  IDCLUB: string;
  CLUB_ABREGE: string;
  CLUB_NOM_COMPLET: string;
  CLUB_NOMS: string[];
  SCORE: number;
}

export interface CreateClubWizardPayload {
  name: string;
  natioId: string;
  isSelection: boolean;
  creationDate?: string;
  villeId?: string | number;
}

interface ClubCandidateRow {
  IDCLUB: string;
  CLUB_ABREGE: string;
  CLUB_NOM_COMPLET: string;
  CLUB_NOMS_HISTORIQUE: string;
}

function parseHistoryNames(rawHistory: string, latestName: string): string[] {
  const items = rawHistory
    .split('|||')
    .map((name) => name.trim())
    .filter(Boolean);

  const deduped: string[] = [];
  const seen = new Set<string>();

  const latest = String(latestName ?? '').trim();
  if (latest) {
    deduped.push(latest);
    seen.add(normalizeSearchText(latest));
  }

  for (const item of items) {
    const key = normalizeSearchText(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function tokenizeNormalized(value: string): string[] {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function toFrenchPhoneticKey(value: string): string {
  let v = normalizeSearchText(value);
  if (!v) return '';

  v = v
    .replace(/ph/g, 'f')
    .replace(/ch/g, 'x')
    .replace(/gn/g, 'n')
    .replace(/qu/g, 'k')
    .replace(/ck/g, 'k')
    .replace(/c(?=[eiiy])/g, 's')
    .replace(/c/g, 'k')
    .replace(/z/g, 's')
    .replace(/y/g, 'i');

  v = v.replace(/[aeiou]/g, '');
  v = v.replace(/(.)\1+/g, '$1');
  return v;
}

function damerauLevenshteinDistance(a: string, b: string): number {
  const lev = levenshteinDistance(a, b);
  if (a.length < 2 || b.length < 2) {
    return lev;
  }

  let best = lev;
  for (let i = 0; i < a.length - 1; i += 1) {
    const swapped = a.slice(0, i) + a[i + 1] + a[i] + a.slice(i + 2);
    const dist = levenshteinDistance(swapped, b);
    if (dist < best) {
      best = dist;
    }
    if (best === 0) {
      return 0;
    }
  }
  return best;
}

function computeApproxScore(
  query: string,
  clubAbrege: string,
  clubNomComplet: string,
  clubNomsHistorique: string,
): { score: number; bestDistance: number } {
  const q = normalizeSearchText(query);
  if (!q) return { score: 0, bestDistance: 99 };

  const a = normalizeSearchText(clubAbrege);
  const n = normalizeSearchText(clubNomComplet);
  const h = normalizeSearchText(clubNomsHistorique);
  const combined = `${a} ${n}`.trim();
  if (!combined) return { score: 0, bestDistance: 99 };

  const tokens = [
    ...tokenizeNormalized(clubAbrege),
    ...tokenizeNormalized(clubNomComplet),
    ...tokenizeNormalized(clubNomsHistorique),
  ];
  const tokenDistances = tokens.map((token) => damerauLevenshteinDistance(q, token));
  const bestTokenDistance = tokenDistances.length > 0 ? Math.min(...tokenDistances) : 99;
  const distA = a ? damerauLevenshteinDistance(q, a.slice(0, Math.max(q.length + 6, 10))) : 99;
  const distN = n ? damerauLevenshteinDistance(q, n.slice(0, Math.max(q.length + 6, 10))) : 99;
  const distH = h ? damerauLevenshteinDistance(q, h.slice(0, Math.max(q.length + 6, 10))) : 99;
  const bestDistance = Math.min(bestTokenDistance, distA, distN, distH);

  let score = 0;

  if (n === q) score += 320;
  if (a === q) score += 280;

  if (a.startsWith(q)) score += 90;
  if (n.startsWith(q)) score += 180;
  if (h.startsWith(q)) score += 120;
  if (a.includes(q)) score += 60;
  if (n.includes(q)) score += 130;
  if (h.includes(q)) score += 95;

  const nameTokens = tokenizeNormalized(clubNomComplet);
  if (nameTokens.some((token) => token === q)) score += 160;
  if (nameTokens.some((token) => token.startsWith(q))) score += 110;

  const abregeTokens = tokenizeNormalized(clubAbrege);
  if (abregeTokens.some((token) => token === q)) score += 45;
  if (abregeTokens.some((token) => token.startsWith(q))) score += 30;

  const qPhon = toFrenchPhoneticKey(q);
  if (qPhon) {
    const aPhon = toFrenchPhoneticKey(a);
    const nPhon = toFrenchPhoneticKey(n);
    const hPhon = toFrenchPhoneticKey(h);
    if (aPhon && (aPhon.includes(qPhon) || qPhon.includes(aPhon))) score += 20;
    if (nPhon && (nPhon.includes(qPhon) || qPhon.includes(nPhon))) score += 45;
    if (hPhon && (hPhon.includes(qPhon) || qPhon.includes(hPhon))) score += 30;
  }

  if (bestDistance <= 1) score += 170;
  else if (bestDistance === 2) score += 110;
  else if (bestDistance === 3) score += 60;
  else if (bestDistance === 4) score += 20;

  const maxLen = Math.max(q.length, n.length || 1);
  const ratio = 1 - (bestDistance / maxLen);
  if (ratio > 0.72) score += 22;
  if (ratio > 0.85) score += 30;

  // Slight preference for concise matches when relevance score is close.
  if (n && n.length <= q.length + 6) score += 6;

  const hasStrongContains = a.includes(q) || n.includes(q);
  if (!hasStrongContains && bestDistance >= 6) {
    score -= 28;
  }

  return { score, bestDistance };
}

export async function getClubsGrid(search: string): Promise<ClubsGridResponse> {
  const normalizedSearch = search.trim().toLowerCase();
  const likeSearch = `%${normalizedSearch}%`;
  const params = [normalizedSearch, likeSearch, likeSearch];
  const data = await dbAll<ClubGridRow>(
    `SELECT
       c.IDCLUB,
       c.CLUB AS CLUB_ABREGE,
       COALESCE((
         SELECT cn.CN_NOM
         FROM CLUB_NOM cn
         WHERE cn.IDCLUB = c.IDCLUB
           AND (cn.CN_ACTION IS NULL OR cn.CN_ACTION <> 3)
         ORDER BY cn.DATE DESC
         LIMIT 1
       ), '') AS CLUB_NOM_COMPLET,
       COALESCE(v.NOM, '') AS VILLE_NOM
     FROM CLUB c
     LEFT JOIN VILLE v ON v.VICLEUNIK = c.IDVILLE
     WHERE (
       ? = ''
       OR LOWER(COALESCE(c.CLUB, '')) LIKE ?
       OR LOWER(COALESCE(v.NOM, '')) LIKE ?
     )
     ORDER BY c.CLUB ASC, c.IDCLUB ASC`,
    params,
  );

  return { data };
}

export async function getClubGridById(id: string): Promise<ClubGridRow | undefined> {
  return dbGet<ClubGridRow>(
    `SELECT
       c.IDCLUB,
       c.CLUB AS CLUB_ABREGE,
       COALESCE((
         SELECT cn.CN_NOM
         FROM CLUB_NOM cn
         WHERE cn.IDCLUB = c.IDCLUB
           AND (cn.CN_ACTION IS NULL OR cn.CN_ACTION <> 3)
         ORDER BY cn.DATE DESC
         LIMIT 1
       ), '') AS CLUB_NOM_COMPLET,
       COALESCE(v.NOM, '') AS VILLE_NOM
     FROM CLUB c
     LEFT JOIN VILLE v ON v.VICLEUNIK = c.IDVILLE
     WHERE c.IDCLUB = ?
     LIMIT 1`,
    [id],
  );
}

export async function getClubProfileById(id: string): Promise<ClubProfileRow | undefined> {
  return dbGet<ClubProfileRow>(
    `SELECT
       c.IDCLUB,
       c.CLUB AS CLUB_ABREGE,
       c.IDNATIO,
       c.IDVILLE,
       COALESCE(v.NOM, '') AS VILLE_NOM,
       COALESCE(v.IDNATIO, '') AS VILLE_IDNATIO,
       c.FOND,
       c.TEXTE
     FROM CLUB c
     LEFT JOIN VILLE v ON v.VICLEUNIK = c.IDVILLE
     WHERE c.IDCLUB = ?
     LIMIT 1`,
    [id],
  );
}

export async function getClubNameHistoryById(id: string): Promise<ClubNameHistoryRow[]> {
  return dbAll<ClubNameHistoryRow>(
    `SELECT
       cn.IDCLUB_NOM,
       cn.DATE,
       COALESCE(cn.CN_ACTION, 0) AS CN_ACTION,
       cn.CN_NOM
     FROM CLUB_NOM cn
     WHERE cn.IDCLUB = ?
     ORDER BY cn.DATE DESC, cn.IDCLUB_NOM DESC`,
    [id],
  );
}

export async function getClubTerrainHistoryById(id: string): Promise<ClubTerrainHistoryRow[]> {
  return dbAll<ClubTerrainHistoryRow>(
    `SELECT
       ct.CT_CLEUNIK,
       ct.TECLEUNIK,
       ct.DATE,
       COALESCE(t.STADE, '') AS STADE
     FROM CLUB_TERRAIN ct
     LEFT JOIN TERRAIN t ON t.TECLEUNIK = ct.TECLEUNIK
     WHERE ct.IDCLUB = ?
     ORDER BY ct.DATE DESC, ct.CT_CLEUNIK DESC`,
    [id],
  );
}

export async function getClubMatchesById(id: string): Promise<ClubMatchRow[]> {
  const clubId = normalizeText(id);
  if (!clubId) {
    throw new AppError(400, 'Identifiant de club invalide.');
  }

  const rows = await dbAll<Array<ClubMatchRow & {
    HEURE: string;
    COCLEUNIK: number | null;
    COMPET_NOM: string;
    TOUR_NOM: string;
    CIRC: string | null;
    TUCLEUNIK: number;
    SAISON: string;
    CO_ANNEE: number;
    TERRAIN_NOM: string;
  }>[number]>(
    `SELECT
       r.RECLEUNIK,
       REPLACE(COALESCE(r.DATE, ''), '-', '') AS DATE,
         COALESCE(r.HEURE, '') AS HEURE,
       COALESCE(r.TUCLEUNIK, 0) AS TUCLEUNIK,
      COALESCE(te.STADE, '') AS TERRAIN_NOM,
       r.DOMICILE,
       r.EXTERIEUR,
       COALESCE(cd.CLUB, r.DOMICILE, '') AS DOMICILE_NOM,
       COALESCE(ce.CLUB, r.EXTERIEUR, '') AS EXTERIEUR_NOM,
       COALESCE(r.BUTDOM, 0) AS BUTDOM,
       COALESCE(r.BUTEXT, 0) AS BUTEXT,
       COALESCE(r.TABDOM, 0) AS TABDOM,
       COALESCE(r.TABEXT, 0) AS TABEXT,
       COALESCE(r.ETAT, 0) AS ETAT,
       t.COCLEUNIK,
       COALESCE(c.CIRC, '') AS CIRC,
       COALESCE(t.NOM, '') AS TOUR_NOM,
       COALESCE(co.NOM, '') AS COMPET_NOM,
       COALESCE(co.SAISON, r.SAISON, '') AS SAISON,
       COALESCE(co.CO_ANNEE, 0) AS CO_ANNEE
     FROM RENCO r
     LEFT JOIN CIRC c ON c.IDCIRC = r.IDCIRC
     LEFT JOIN TOUR t ON t.TUCLEUNIK = r.TUCLEUNIK
     LEFT JOIN COMPET co ON co.COCLEUNIK = t.COCLEUNIK
    LEFT JOIN MATCH m ON m.RECLEUNIK = r.RECLEUNIK
    LEFT JOIN TERRAIN te ON te.TECLEUNIK = m.TECLEUNIK
     LEFT JOIN CLUB cd ON cd.IDCLUB = r.DOMICILE
     LEFT JOIN CLUB ce ON ce.IDCLUB = r.EXTERIEUR
     WHERE r.DOMICILE = ? OR r.EXTERIEUR = ?
     ORDER BY REPLACE(COALESCE(r.DATE, ''), '-', '') DESC, COALESCE(r.HEURE, '') DESC, r.RECLEUNIK DESC`,
    [clubId, clubId],
  );

  const { saison: resolveSeasonLabel, circComplet: buildCircComplete } = await buildCircCompletResolver(rows);

  return rows.map((row) => ({
    ...(() => {
      const explicitTerrain = normalizeText(row.TERRAIN_NOM);
      const defaultTerrain = explicitTerrain ? null : getLatestTerrainForClub(row.DOMICILE);
      return { TERRAIN_NOM: explicitTerrain || defaultTerrain?.TERRAIN_NOM || '' };
    })(),
    RECLEUNIK: Number(row.RECLEUNIK),
    DATE: String(row.DATE ?? ''),
    HEURE: String(row.HEURE ?? ''),
    COCLEUNIK: row.COCLEUNIK == null ? null : Number(row.COCLEUNIK),
    COMPET_NOM: String(row.COMPET_NOM ?? '').trim(),
    TOUR_NOM: String(row.TOUR_NOM ?? '').trim(),
    CIRC: String(row.CIRC ?? '').trim(),
    LIEU: String(row.DOMICILE ?? '') === clubId ? 'Domicile' : 'Extérieur',
    SAISON: resolveSeasonLabel(row),
    CIRC_COMPLET: buildCircComplete(row),
    DOMICILE: String(row.DOMICILE ?? ''),
    EXTERIEUR: String(row.EXTERIEUR ?? ''),
    DOMICILE_NOM: String(row.DOMICILE_NOM ?? ''),
    EXTERIEUR_NOM: String(row.EXTERIEUR_NOM ?? ''),
    BUTDOM: Number(row.BUTDOM ?? 0),
    BUTEXT: Number(row.BUTEXT ?? 0),
    TABDOM: Number(row.TABDOM ?? 0),
    TABEXT: Number(row.TABEXT ?? 0),
    ETAT: Number(row.ETAT ?? 0),
  }));
}

export async function createClubTerrainHistoryById(
  id: string,
  payload: { date?: string | null; terrainId: string | number },
): Promise<ClubTerrainHistoryRow | undefined> {
  const clubId = normalizeText(id);
  if (!clubId) {
    throw new AppError(400, 'Identifiant de club invalide.');
  }

  const club = await dbGet<{ IDCLUB: string }>('SELECT IDCLUB FROM CLUB WHERE IDCLUB = ?', [clubId]);
  if (!club) {
    return undefined;
  }

  const normalizedDate = normalizeClubNameDate(payload.date);
  const terrainId = normalizeTerrainId(payload.terrainId);

  await dbRun(
    `INSERT INTO CLUB_TERRAIN (IDCLUB, TECLEUNIK, DATE)
     VALUES (?, ?, ?)`,
    [clubId, terrainId, normalizedDate],
  );

  return dbGet<ClubTerrainHistoryRow>(
    `SELECT
       ct.CT_CLEUNIK,
       ct.TECLEUNIK,
       ct.DATE,
       COALESCE(t.STADE, '') AS STADE
     FROM CLUB_TERRAIN ct
     LEFT JOIN TERRAIN t ON t.TECLEUNIK = ct.TECLEUNIK
     WHERE ct.IDCLUB = ?
     ORDER BY ct.CT_CLEUNIK DESC
     LIMIT 1`,
    [clubId],
  );
}

export async function updateClubTerrainHistoryById(
  id: string,
  terrainHistoryId: string,
  payload: { date?: string | null; terrainId: string | number },
): Promise<ClubTerrainHistoryRow | undefined> {
  const clubId = normalizeText(id);
  const historyNumericId = Number(terrainHistoryId);

  if (!clubId) {
    throw new AppError(400, 'Identifiant de club invalide.');
  }
  if (!Number.isInteger(historyNumericId) || historyNumericId <= 0) {
    throw new AppError(400, 'Identifiant de stade club invalide.');
  }

  const existing = await dbGet<{ CT_CLEUNIK: number }>(
    'SELECT CT_CLEUNIK FROM CLUB_TERRAIN WHERE CT_CLEUNIK = ? AND IDCLUB = ?',
    [historyNumericId, clubId],
  );
  if (!existing) {
    return undefined;
  }

  const normalizedDate = normalizeClubNameDate(payload.date);
  const terrainId = normalizeTerrainId(payload.terrainId);

  await dbRun(
    `UPDATE CLUB_TERRAIN
     SET TECLEUNIK = ?, DATE = ?
     WHERE CT_CLEUNIK = ? AND IDCLUB = ?`,
    [terrainId, normalizedDate, historyNumericId, clubId],
  );

  return dbGet<ClubTerrainHistoryRow>(
    `SELECT
       ct.CT_CLEUNIK,
       ct.TECLEUNIK,
       ct.DATE,
       COALESCE(t.STADE, '') AS STADE
     FROM CLUB_TERRAIN ct
     LEFT JOIN TERRAIN t ON t.TECLEUNIK = ct.TECLEUNIK
     WHERE ct.CT_CLEUNIK = ? AND ct.IDCLUB = ?
     LIMIT 1`,
    [historyNumericId, clubId],
  );
}

export async function deleteClubTerrainHistoryById(id: string, terrainHistoryId: string): Promise<boolean> {
  const clubId = normalizeText(id);
  const historyNumericId = Number(terrainHistoryId);

  if (!clubId) {
    throw new AppError(400, 'Identifiant de club invalide.');
  }
  if (!Number.isInteger(historyNumericId) || historyNumericId <= 0) {
    throw new AppError(400, 'Identifiant de stade club invalide.');
  }

  const result = await dbRun(
    'DELETE FROM CLUB_TERRAIN WHERE CT_CLEUNIK = ? AND IDCLUB = ?',
    [historyNumericId, clubId],
  );
  return result.changes > 0;
}

export async function createClubNameHistoryById(
  id: string,
  payload: { date?: string | null; eventType: number | string; name: string },
): Promise<ClubNameHistoryRow | undefined> {
  const clubId = normalizeText(id);
  if (!clubId) {
    throw new AppError(400, 'Identifiant de club invalide.');
  }

  const club = await dbGet<{ IDCLUB: string }>('SELECT IDCLUB FROM CLUB WHERE IDCLUB = ?', [clubId]);
  if (!club) {
    return undefined;
  }

  const normalizedDate = normalizeClubNameDate(payload.date);
  const eventType = normalizeClubNameEventType(payload.eventType);
  const name = normalizeText(payload.name);

  if (!name) {
    throw new AppError(400, 'Le nom est requis.');
  }

  await dbRun(
    `INSERT INTO CLUB_NOM (CN_NOM, IDCLUB, DATE, CN_ACTION)
     VALUES (?, ?, ?, ?)`,
    [name.slice(0, 200), clubId, normalizedDate, eventType],
  );

  return dbGet<ClubNameHistoryRow>(
    `SELECT IDCLUB_NOM, DATE, COALESCE(CN_ACTION, 0) AS CN_ACTION, CN_NOM
     FROM CLUB_NOM
     WHERE IDCLUB = ?
     ORDER BY IDCLUB_NOM DESC
     LIMIT 1`,
    [clubId],
  );
}

export async function updateClubNameHistoryById(
  id: string,
  historyId: string,
  payload: { date?: string | null; eventType: number | string; name: string },
): Promise<ClubNameHistoryRow | undefined> {
  const clubId = normalizeText(id);
  const historyNumericId = Number(historyId);

  if (!clubId) {
    throw new AppError(400, 'Identifiant de club invalide.');
  }
  if (!Number.isInteger(historyNumericId) || historyNumericId <= 0) {
    throw new AppError(400, 'Identifiant de nom club invalide.');
  }

  const existing = await dbGet<{ IDCLUB_NOM: number }>(
    'SELECT IDCLUB_NOM FROM CLUB_NOM WHERE IDCLUB_NOM = ? AND IDCLUB = ?',
    [historyNumericId, clubId],
  );
  if (!existing) {
    return undefined;
  }

  const normalizedDate = normalizeClubNameDate(payload.date);
  const eventType = normalizeClubNameEventType(payload.eventType);
  const name = normalizeText(payload.name);
  if (!name) {
    throw new AppError(400, 'Le nom est requis.');
  }

  await dbRun(
    `UPDATE CLUB_NOM
     SET CN_NOM = ?, DATE = ?, CN_ACTION = ?
     WHERE IDCLUB_NOM = ? AND IDCLUB = ?`,
    [name.slice(0, 200), normalizedDate, eventType, historyNumericId, clubId],
  );

  return dbGet<ClubNameHistoryRow>(
    `SELECT IDCLUB_NOM, DATE, COALESCE(CN_ACTION, 0) AS CN_ACTION, CN_NOM
     FROM CLUB_NOM
     WHERE IDCLUB_NOM = ? AND IDCLUB = ?
     LIMIT 1`,
    [historyNumericId, clubId],
  );
}

export async function deleteClubNameHistoryById(id: string, historyId: string): Promise<boolean> {
  const clubId = normalizeText(id);
  const historyNumericId = Number(historyId);

  if (!clubId) {
    throw new AppError(400, 'Identifiant de club invalide.');
  }
  if (!Number.isInteger(historyNumericId) || historyNumericId <= 0) {
    throw new AppError(400, 'Identifiant de nom club invalide.');
  }

  const result = await dbRun(
    'DELETE FROM CLUB_NOM WHERE IDCLUB_NOM = ? AND IDCLUB = ?',
    [historyNumericId, clubId],
  );
  return result.changes > 0;
}

export async function updateClubColorsById(
  id: string,
  payload: { fond: string | number | null; texte: string | number | null },
): Promise<ClubProfileRow | undefined> {
  const clubId = normalizeText(id);
  if (!clubId) {
    throw new AppError(400, 'Identifiant de club invalide.');
  }

  await dbRun(
    'UPDATE CLUB SET FOND = ?, TEXTE = ? WHERE IDCLUB = ?',
    [payload.fond ?? null, payload.texte ?? null, clubId],
  );

  return getClubProfileById(clubId);
}

export async function updateClubProfileById(
  id: string,
  payload: { name: string; natioId: string; villeId?: string | number | null; fond?: string | number | null; texte?: string | number | null },
): Promise<ClubProfileRow | undefined> {
  const clubId = normalizeText(id);
  const name = normalizeText(payload.name);
  const natioId = normalizeText(payload.natioId).toUpperCase();

  if (!clubId) {
    throw new AppError(400, 'Identifiant de club invalide.');
  }
  if (!name) {
    throw new AppError(400, 'Le nom du club est requis.');
  }
  if (!natioId) {
    throw new AppError(400, 'Le pays est requis.');
  }

  const current = await getClubProfileById(clubId);
  if (!current) {
    return undefined;
  }

  const country = await dbGet<{ IDNATIO: string }>('SELECT IDNATIO FROM NATIO WHERE IDNATIO = ?', [natioId]);
  if (!country) {
    throw new AppError(400, 'Le pays selectionne est introuvable.');
  }

  const villeId = await resolveVilleIdForClub(natioId, payload.villeId ?? current.IDVILLE ?? undefined);
  const nowDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const nameChanged = normalizeText(String(current.CLUB_ABREGE ?? '')) !== name;

  await dbRun(
    'UPDATE CLUB SET CLUB = ?, IDNATIO = ?, IDVILLE = ?, FOND = ?, TEXTE = ? WHERE IDCLUB = ?',
    [name.slice(0, 100), natioId, villeId, payload.fond ?? null, payload.texte ?? null, clubId],
  );

  if (nameChanged) {
    await dbRun(
      `INSERT INTO CLUB_NOM (CN_NOM, IDCLUB, DATE, CN_ACTION)
       VALUES (?, ?, ?, ?)`,
      [name.slice(0, 200), clubId, nowDate, 2],
    );
  }

  return getClubProfileById(clubId);
}

export async function getClubSuggestions(search: string, limit = 12): Promise<ClubSuggestionsResponse> {
  const query = search.trim();
  if (!query) {
    return { data: [] };
  }

  const rows = await dbAll<ClubCandidateRow>(
    `SELECT
       c.IDCLUB,
       c.CLUB AS CLUB_ABREGE,
       COALESCE((
         SELECT cn.CN_NOM
         FROM CLUB_NOM cn
         WHERE cn.IDCLUB = c.IDCLUB
           AND (cn.CN_ACTION IS NULL OR cn.CN_ACTION <> 3)
         ORDER BY cn.DATE DESC
         LIMIT 1
       ), '') AS CLUB_NOM_COMPLET
       ,COALESCE((
         SELECT GROUP_CONCAT(hist.CN_NOM, '|||')
         FROM (
           SELECT cn2.CN_NOM, cn2.DATE
           FROM CLUB_NOM cn2
           WHERE cn2.IDCLUB = c.IDCLUB
             AND (cn2.CN_ACTION IS NULL OR cn2.CN_ACTION <> 3)
           ORDER BY cn2.DATE DESC
         ) hist
       ), '') AS CLUB_NOMS_HISTORIQUE
     FROM CLUB c
     ORDER BY c.CLUB ASC, c.IDCLUB ASC`,
  );

  const scored = rows
    .map((row) => ({
      ...row,
      ...computeApproxScore(
        query,
        String(row.CLUB_ABREGE ?? ''),
        String(row.CLUB_NOM_COMPLET ?? ''),
        String(row.CLUB_NOMS_HISTORIQUE ?? ''),
      ),
    }))
    .filter((row) => row.score >= 24)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.bestDistance !== b.bestDistance) return a.bestDistance - b.bestDistance;
      const byFullName = String(a.CLUB_NOM_COMPLET).localeCompare(String(b.CLUB_NOM_COMPLET));
      if (byFullName !== 0) return byFullName;
      return String(a.CLUB_ABREGE).localeCompare(String(b.CLUB_ABREGE));
    })
    .map((row) => ({
      IDCLUB: row.IDCLUB,
      CLUB_ABREGE: row.CLUB_ABREGE,
      CLUB_NOM_COMPLET: row.CLUB_NOM_COMPLET,
      CLUB_NOMS: parseHistoryNames(String(row.CLUB_NOMS_HISTORIQUE ?? ''), String(row.CLUB_NOM_COMPLET ?? '')),
      SCORE: row.score,
    }))
    .slice(0, Math.max(1, Math.min(limit, 30)));

  return { data: scored };
}

export async function removeClubById(id: string): Promise<boolean> {
  // CLUB_NOM and CLUB_TERRAIN are owned by CLUB and can be cleaned up on delete.
  await dbRun('DELETE FROM CLUB_NOM WHERE IDCLUB = ?', [id]);
  await dbRun('DELETE FROM CLUB_TERRAIN WHERE IDCLUB = ?', [id]);
  const result = await dbRun('DELETE FROM CLUB WHERE IDCLUB = ?', [id]);
  return result.changes > 0;
}

export interface ClubMergeResult {
  sourceId: string;
  targetId: string;
  rencontresDomicile: number;
  rencontresExterieur: number;
  participations: number;
  nomsSupprimes: number;
  terrainsSupprimes: number;
}

export async function mergeClubs(sourceIdInput: unknown, targetIdInput: unknown): Promise<ClubMergeResult> {
  const sourceId = normalizeText(sourceIdInput);
  const targetId = normalizeText(targetIdInput);

  if (!sourceId || !targetId) {
    throw new AppError(400, 'Le club source et le club cible sont obligatoires.');
  }
  if (sourceId === targetId) {
    throw new AppError(400, 'Le club source et le club cible doivent etre differents.');
  }

  const source = await dbGet<{ IDCLUB: string }>('SELECT "IDCLUB" FROM "CLUB" WHERE "IDCLUB" = ?', [sourceId]);
  if (!source) {
    throw new AppError(404, 'Club source introuvable.');
  }
  const target = await dbGet<{ IDCLUB: string }>('SELECT "IDCLUB" FROM "CLUB" WHERE "IDCLUB" = ?', [targetId]);
  if (!target) {
    throw new AppError(404, 'Club cible introuvable.');
  }

  const transaction = db.transaction((): ClubMergeResult => {
    const rencontresDomicile = db
      .prepare('UPDATE "RENCO" SET "DOMICILE" = ? WHERE "DOMICILE" = ?')
      .run(targetId, sourceId).changes;
    const rencontresExterieur = db
      .prepare('UPDATE "RENCO" SET "EXTERIEUR" = ? WHERE "EXTERIEUR" = ?')
      .run(targetId, sourceId).changes;
    const participations = db
      .prepare('UPDATE "PARTICIP" SET "IDCLUB" = ? WHERE "IDCLUB" = ?')
      .run(targetId, sourceId).changes;
    const nomsSupprimes = db.prepare('DELETE FROM "CLUB_NOM" WHERE "IDCLUB" = ?').run(sourceId).changes;
    const terrainsSupprimes = db.prepare('DELETE FROM "CLUB_TERRAIN" WHERE "IDCLUB" = ?').run(sourceId).changes;
    db.prepare('DELETE FROM "CLUB" WHERE "IDCLUB" = ?').run(sourceId);

    return {
      sourceId,
      targetId,
      rencontresDomicile: Number(rencontresDomicile ?? 0),
      rencontresExterieur: Number(rencontresExterieur ?? 0),
      participations: Number(participations ?? 0),
      nomsSupprimes: Number(nomsSupprimes ?? 0),
      terrainsSupprimes: Number(terrainsSupprimes ?? 0),
    };
  });

  return transaction();
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeClubNameDate(value: unknown): string | null {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    return `${compact[1]}${compact[2]}${compact[3]}`;
  }

  const dashed = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashed) {
    return `${dashed[1]}${dashed[2]}${dashed[3]}`;
  }

  throw new AppError(400, 'La date est invalide.');
}

function normalizeClubNameEventType(value: unknown): number {
  const eventType = Number(value);
  if (!Number.isInteger(eventType) || eventType < 1 || eventType > 3) {
    throw new AppError(400, 'Le type d evenement est invalide.');
  }
  return eventType;
}

function normalizeTerrainId(value: unknown): number {
  const terrainId = Number(value);
  if (!Number.isInteger(terrainId) || terrainId <= 0) {
    throw new AppError(400, 'Le stade selectionne est invalide.');
  }
  return terrainId;
}

function toSelectionFlag(value: unknown): 0 | 1 {
  return value ? 1 : 0;
}

async function resolveNextClubId(): Promise<string> {
  const row = await dbGet<{ maxId: number | null }>(
    'SELECT MAX(CAST(IDCLUB AS INTEGER)) AS maxId FROM CLUB',
  );
  const nextNumericId = Math.max(0, Number(row?.maxId ?? 0)) + 1;
  if (nextNumericId > 9999) {
    throw new AppError(400, 'Impossible de generer un identifiant club (limite 9999 atteinte).');
  }
  return String(nextNumericId).padStart(4, '0');
}

async function resolveVilleIdForClub(natioId: string, villeId?: string | number): Promise<number> {
  const explicit = normalizeText(villeId);
  if (explicit) {
    const found = await dbGet<{ VICLEUNIK: number }>('SELECT VICLEUNIK FROM VILLE WHERE VICLEUNIK = ?', [explicit]);
    if (!found) {
      throw new AppError(400, 'La ville selectionnee est introuvable.');
    }
    return Number(found.VICLEUNIK);
  }

  const fallback = await dbGet<{ VICLEUNIK: number }>(
    'SELECT VICLEUNIK FROM VILLE WHERE IDNATIO = ? ORDER BY NOM ASC, VICLEUNIK ASC LIMIT 1',
    [natioId],
  );
  if (!fallback) {
    throw new AppError(400, 'Aucune ville disponible pour ce pays. Selectionnez une ville.');
  }
  return Number(fallback.VICLEUNIK);
}

function normalizeCreationDate(value: string | number | null | undefined): string {
  const raw = normalizeText(value);
  if (!raw) {
    throw new AppError(400, 'La date de création est requise.');
  }

  const iso = raw.match(/^\d{4}-\d{2}-\d{2}$/)
    ? raw
    : raw.match(/^\d{4}\/\d{2}\/\d{2}$/)
      ? raw.replace(/\//g, '-')
      : raw.match(/^\d{2}\/\d{2}\/\d{4}$/)
        ? `${raw.slice(6, 10)}-${raw.slice(3, 5)}-${raw.slice(0, 2)}`
        : null;

  if (!iso) {
    throw new AppError(400, 'La date de création est invalide.');
  }

  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, 'La date de création est invalide.');
  }

  return iso.replace(/-/g, '');
}

export async function createClubWithWizard(payload: CreateClubWizardPayload): Promise<ClubGridRow> {
  const name = normalizeText(payload.name);
  const natioId = normalizeText(payload.natioId).toUpperCase();
  const isSelection = Boolean(payload.isSelection);
  const creationDate = normalizeCreationDate(payload.creationDate);

  if (!name) {
    throw new AppError(400, 'Le nom du club est requis.');
  }
  if (!natioId) {
    throw new AppError(400, 'Le pays est requis.');
  }

  const country = await dbGet<{ IDNATIO: string }>('SELECT IDNATIO FROM NATIO WHERE IDNATIO = ?', [natioId]);
  if (!country) {
    throw new AppError(400, 'Le pays selectionne est introuvable.');
  }

  if (!isSelection && !normalizeText(payload.villeId)) {
    throw new AppError(400, 'La ville est requise lorsque le club nest pas une selection nationale.');
  }

  const idClub = await resolveNextClubId();
  const idVille = await resolveVilleIdForClub(natioId, payload.villeId);

  await dbRun(
    `INSERT INTO CLUB (IDCLUB, CLUB, IDNATIO, FOND, TEXTE, IDVILLE, CL_SELECTION)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [idClub, name.slice(0, 100), natioId, -1, -1, idVille, toSelectionFlag(isSelection)],
  );

  await dbRun(
    `INSERT INTO CLUB_NOM (CN_NOM, IDCLUB, DATE, CN_ACTION)
     VALUES (?, ?, ?, ?)`,
    [name.slice(0, 200), idClub, creationDate, 1],
  );

  const created = await getClubGridById(idClub);
  if (!created) {
    throw new AppError(500, 'Le club a été créé mais est introuvable après création.');
  }
  return created;
}

const baseService = createEntityService({
  table:           'CLUB_NOM',
  pk:              'IDCLUB_NOM',
  selectCols:      ['IDCLUB_NOM', 'CN_NOM', 'IDCLUB', 'DATE', 'CN_ACTION'],
  allowedSortCols: ['IDCLUB_NOM', 'IDCLUB', 'CN_NOM', 'DATE'],
  searchCols:      ['CN_NOM'],
  filterCols:      ['IDCLUB'],
});

const CLUB_NOM_TABLE = 'CLUB_NOM';
const CLUB_NOM_PK = 'IDCLUB_NOM';
const CLUB_NOM_ALLOWED_SORT_COLS = ['IDCLUB_NOM', 'IDCLUB', 'CN_NOM', 'DATE'] as const;
const CLUB_NOM_SEARCH_COLS = ['CN_NOM'] as const;
const CLUB_NOM_FILTER_COLS = ['IDCLUB'] as const;
const CLUB_NOM_SELECT_COLUMNS = ['IDCLUB_NOM', 'IDCLUB', 'CN_NOM', 'DATE', 'CN_ACTION'] as const;
const CLUB_NOM_SELECT_SQL = CLUB_NOM_SELECT_COLUMNS.map((col) => `"${col}"`).join(', ');

async function getClubNomAll(params: QueryParams): Promise<PaginatedResult> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(params.limit) || 20));
  const offset = (page - 1) * limit;
  const sort = sanitizeSort(params.sort, CLUB_NOM_ALLOWED_SORT_COLS, CLUB_NOM_PK);
  const order = params.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const { where, bindings } = buildWhere(params, CLUB_NOM_SEARCH_COLS, CLUB_NOM_FILTER_COLS);

  const row = await dbGet<{ total: number }>(
    `SELECT COUNT(*) AS total FROM "${CLUB_NOM_TABLE}" ${where}`,
    bindings,
  );
  const total = row?.total ?? 0;

  const data = await dbAll(
    `SELECT ${CLUB_NOM_SELECT_SQL}
     FROM "${CLUB_NOM_TABLE}" ${where}
     ORDER BY "${sort}" ${order}
     LIMIT ? OFFSET ?`,
    [...bindings, limit, offset],
  );

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function getClubNomById(id: string | number): Promise<Record<string, unknown> | undefined> {
  return dbGet(
    `SELECT ${CLUB_NOM_SELECT_SQL}
     FROM "${CLUB_NOM_TABLE}"
     WHERE "${CLUB_NOM_PK}" = ?`,
    [id],
  );
}

async function createClubNom(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const keys = Object.keys(body);
  if (!keys.length) {
    throw new AppError(400, 'No fields provided');
  }

  const cols = keys.map((key) => `"${key}"`).join(', ');
  const marks = keys.map(() => '?').join(', ');
  const result = await dbRun(
    `INSERT INTO "${CLUB_NOM_TABLE}" (${cols}) VALUES (${marks})`,
    Object.values(body),
  );

  const explicitPkValue = body[CLUB_NOM_PK];
  if (typeof explicitPkValue === 'string' || typeof explicitPkValue === 'number') {
    return getClubNomById(explicitPkValue);
  }
  if (typeof result.lastInsertRowid === 'string' || typeof result.lastInsertRowid === 'number') {
    return getClubNomById(result.lastInsertRowid);
  }

  return undefined;
}

async function updateClubNom(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const keys = Object.keys(body);
  if (!keys.length) {
    throw new AppError(400, 'No fields provided');
  }

  const sets = keys.map((key) => `"${key}" = ?`).join(', ');
  await dbRun(
    `UPDATE "${CLUB_NOM_TABLE}" SET ${sets} WHERE "${CLUB_NOM_PK}" = ?`,
    [...Object.values(body), id],
  );

  return getClubNomById(id);
}

export async function getClubPalmares(id: string): Promise<ClubPalmareRow[]> {
  const clubId = normalizeText(id);
  if (!clubId) throw new AppError(400, 'Identifiant de club invalide.');

  const rows = await dbAll<{ IDEPREUVE: number; EPREUVE: string; OFFICIELLE: number; SCOPE: number; COCLEUNIK: number; ANNEE: string | null }>(
    `SELECT
       e.IDEPREUVE,
       e.EPREUVE,
       COALESCE(e.OFFICIELLE, 0) AS OFFICIELLE,
       COALESCE(e.SCOPE, 0) AS SCOPE,
       co.COCLEUNIK,
       CASE
         WHEN COALESCE(co.CO_ANNEE, 0) = 1 THEN (
           SELECT MAX(SUBSTR(REPLACE(COALESCE(r2.DATE, ''), '-', ''), 1, 4))
           FROM TOUR t2
           JOIN RENCO r2 ON r2.TUCLEUNIK = t2.TUCLEUNIK
           WHERE t2.COCLEUNIK = co.COCLEUNIK AND COALESCE(t2.TU_FINAL, 0) = 1
         )
         ELSE co.SAISON
       END AS ANNEE
     FROM EPREUVE e
     JOIN COMPET co ON co.IDEPREUVE = e.IDEPREUVE
     WHERE EXISTS (
       SELECT 1
       FROM TOUR t
       LEFT JOIN TOURDEF td ON td.TDCLEUNIK = t.TDCLEUNIK
       WHERE t.COCLEUNIK = co.COCLEUNIK
         AND COALESCE(t.TU_FINAL, 0) = 1
         AND (
           -- Ligue: vérifier que TOUS les matchs sont terminés/annulés
           (COALESCE(td.TDTYPETOUR, 2) = 1
            AND NOT EXISTS (
              SELECT 1 FROM RENCO r
              WHERE r.TUCLEUNIK = t.TUCLEUNIK
                AND COALESCE(r.ETAT, 0) NOT IN (3, 4)
            )
            AND EXISTS (
              SELECT 1 FROM PARTICIP p
              WHERE p.TUCLEUNIK = t.TUCLEUNIK
                AND CAST(p.IDCLUB AS TEXT) = ?
                AND COALESCE(p.PAClassement, 0) = 1
            )
           )
           OR
           -- Eliminatoire: le club gagne le match de la finale
           (COALESCE(td.TDTYPETOUR, 2) = 2
            AND EXISTS (
              SELECT 1 FROM RENCO r
              WHERE r.TUCLEUNIK = t.TUCLEUNIK
                AND COALESCE(r.ETAT, 0) = 3
                AND (
                  (CAST(r.DOMICILE AS TEXT) = ?
                    AND (
                      COALESCE(r.BUTDOM, 0) > COALESCE(r.BUTEXT, 0)
                      OR (COALESCE(r.BUTDOM, 0) = COALESCE(r.BUTEXT, 0) AND COALESCE(r.TABDOM, 0) > COALESCE(r.TABEXT, 0))
                    )
                  )
                  OR
                  (CAST(r.EXTERIEUR AS TEXT) = ?
                    AND (
                      COALESCE(r.BUTEXT, 0) > COALESCE(r.BUTDOM, 0)
                      OR (COALESCE(r.BUTDOM, 0) = COALESCE(r.BUTEXT, 0) AND COALESCE(r.TABEXT, 0) > COALESCE(r.TABDOM, 0))
                    )
                  )
                )
            )
           )
         )
     )
     ORDER BY e.EPREUVE ASC, ANNEE ASC`,
    [clubId, clubId, clubId],
  );

  const grouped = new Map<number, { EPREUVE: string; OFFICIELLE: number; SCOPE: number; annees: Set<string> }>();
  for (const row of rows) {
    const idepreuve = Number(row.IDEPREUVE);
    if (!grouped.has(idepreuve)) {
      grouped.set(idepreuve, { EPREUVE: String(row.EPREUVE ?? ''), OFFICIELLE: Number(row.OFFICIELLE ?? 0), SCOPE: Number(row.SCOPE ?? 0), annees: new Set() });
    }
    const annee = String(row.ANNEE ?? '').trim();
    if (annee) grouped.get(idepreuve)!.annees.add(annee);
  }

  const result = Array.from(grouped.entries()).map(([idepreuve, val]) => ({
    IDEPREUVE: idepreuve,
    EPREUVE: val.EPREUVE,
    OFFICIELLE: val.OFFICIELLE,
    SCOPE: val.SCOPE,
    NB_TITRES: val.annees.size,
    ANNEES: Array.from(val.annees),
  }));

  // Tri par prestige : officiel > non-officiel, scope DESC, NB_TITRES DESC
  result.sort((a, b) =>
    (b.OFFICIELLE - a.OFFICIELLE)
    || (b.SCOPE - a.SCOPE)
    || (b.NB_TITRES - a.NB_TITRES),
  );

  return result;
}

export default {
  ...baseService,
  getAll: getClubNomAll,
  getById: getClubNomById,
  create: createClubNom,
  update: updateClubNom,
  getClubsGrid,
  getClubGridById,
  getClubProfileById,
  getClubNameHistoryById,
  getClubTerrainHistoryById,
  getClubMatchesById,
  getClubPalmares,
  createClubNameHistoryById,
  updateClubNameHistoryById,
  deleteClubNameHistoryById,
  createClubTerrainHistoryById,
  updateClubTerrainHistoryById,
  deleteClubTerrainHistoryById,
  updateClubColorsById,
  updateClubProfileById,
  getClubSuggestions,
  removeClubById,
  createClubWithWizard,
  mergeClubs,
};
