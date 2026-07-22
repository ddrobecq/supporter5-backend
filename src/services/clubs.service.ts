import { createEntityService } from '../lib/baseService';
import { dbAll, dbGet, dbRun } from '../config/database';
import { AppError } from '../types';

/** CLUB_NOM = historique des noms de clubs */
export interface ClubGridRow {
  IDCLUB: string;
  CLUB_ABREGE: string;
  CLUB_NOM_COMPLET: string;
  VILLE_NOM: string;
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

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
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

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const cols = b.length + 1;
  const rows = a.length + 1;
  const dp = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[rows - 1][cols - 1];
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

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
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

export async function createClubWithWizard(payload: CreateClubWizardPayload): Promise<ClubGridRow> {
  const name = normalizeText(payload.name);
  const natioId = normalizeText(payload.natioId).toUpperCase();
  const isSelection = Boolean(payload.isSelection);

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
  const nowDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  await dbRun(
    `INSERT INTO CLUB (IDCLUB, CLUB, IDNATIO, FOND, TEXTE, IDVILLE, CL_SELECTION)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [idClub, name.slice(0, 100), natioId, -1, -1, idVille, toSelectionFlag(isSelection)],
  );

  await dbRun(
    `INSERT INTO CLUB_NOM (CN_NOM, IDCLUB, DATE, CN_ACTION)
     VALUES (?, ?, ?, ?)`,
    [name.slice(0, 200), idClub, nowDate, 0],
  );

  const created = await getClubGridById(idClub);
  if (!created) {
    throw new AppError(500, 'Le club a ete cree mais est introuvable apres creation.');
  }
  return created;
}

const baseService = createEntityService({
  table:           'CLUB_NOM',
  pk:              'IDCLUB_NOM',
  allowedSortCols: ['IDCLUB_NOM', 'IDCLUB', 'CN_NOM', 'DATE'],
  searchCols:      ['CN_NOM'],
  filterCols:      ['IDCLUB'],
});

export default {
  ...baseService,
  getClubsGrid,
  getClubGridById,
  getClubSuggestions,
  removeClubById,
  createClubWithWizard,
};
