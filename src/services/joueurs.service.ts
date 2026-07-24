import { dbAll, dbGet, dbRun } from '../config/database';
import { createEntityService } from '../lib/baseService';
import { buildWhere, sanitizeSort } from '../lib/queryBuilder';
import { levenshteinDistance, normalizeSearchText } from '../lib/searchUtils';
import { AppError, type PaginatedResult, type QueryParams } from '../types';

/** JOUEURRG = registre général des joueurs (nom, prénom, date de naissance…) */
const baseService = createEntityService({
  table:           'JOUEURRG',
  pk:              'IDJOUEUR',
  selectCols: [
    'IDJOUEUR',
    'NOM',
    'PRENOM',
    'NAISSANCE',
    'IDNATIO',
    'POSTE',
    'BUT',
    'PASSE',
    'JAUNE',
    'ROUGE',
    'REMP',
    'TITULAIRE',
    'SURNOM',
    'COMMENT',
    'ENTRAINE',
    'IDVILLE',
    'APPARITION',
    'HAUTEUR',
    'POIDS',
    'DECES',
    'VILLE_DECES',
  ],
  allowedSortCols: ['IDJOUEUR', 'NOM', 'PRENOM', 'NAISSANCE', 'POSTE', 'BUT', 'TITULAIRE'],
  searchCols:      ['NOM', 'PRENOM', 'SURNOM'],
  filterCols:      ['POSTE', 'IDNATIO'],
});

const JOUEURRG_TABLE = 'JOUEURRG';
const JOUEURRG_PK = 'IDJOUEUR';
const JOUEURRG_ALLOWED_SORT_COLS = ['IDJOUEUR', 'NOM', 'PRENOM', 'NAISSANCE', 'POSTE', 'BUT', 'TITULAIRE'] as const;
const JOUEURRG_SEARCH_COLS = ['NOM', 'PRENOM', 'SURNOM'] as const;
const JOUEURRG_FILTER_COLS = ['POSTE', 'IDNATIO'] as const;
// Deliberately excludes PHOTO BLOB: image payloads are served via /api/images only.
const JOUEURRG_SELECT_COLS = [
  'IDJOUEUR',
  'NOM',
  'PRENOM',
  'NAISSANCE',
  'DECES',
  'IDNATIO',
  'POSTE',
  'BUT',
  'PASSE',
  'JAUNE',
  'ROUGE',
  'REMP',
  'TITULAIRE',
  'SURNOM',
  'COMMENT',
  'ENTRAINE',
  'IDVILLE',
  'VILLE_DECES',
  'APPARITION',
] as const;
const JOUEURRG_SELECT_SQL = JOUEURRG_SELECT_COLS.map((col) => `"${col}"`).join(', ');
const JOUEURRG_SELECT_SQL_WITH_ALIAS = JOUEURRG_SELECT_COLS.map((col) => `jr."${col}"`).join(', ');

export interface JoueurGridRow {
  JOCLEUNIK: number;
  IDJOUEUR: string;
  SAISON: string;
  POSTE: number;
  JOUEUR_NOM: string;
  POSTE_NOM: string;
  LAST_TRANSAC_SAISON: string | null;
  LAST_TRANSAC_STATUT: number | null;
  LAST_TRANSAC_TYPE: number | null;
}

export interface PosteOption {
  POS_ID: number;
  POS_NOM: string;
}

export interface JoueurHistoryRow {
  JOCLEUNIK: number;
  SAISON: string;
  POSTE: number;
  POSTE_NOM: string;
  TITULAIRETOTAL: number;
  REMPTOTAL: number;
  BUTTOTAL: number;
  PASSETOTAL: number;
  JAUNETOTAL: number;
  ROUGETOTAL: number;
}

export interface JoueurSuggestionRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  IDNATIO: string;
  SCORE: number;
}

async function getJoueurRgAll(params: QueryParams): Promise<PaginatedResult> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(params.limit) || 20));
  const offset = (page - 1) * limit;
  const sort = sanitizeSort(params.sort, JOUEURRG_ALLOWED_SORT_COLS, JOUEURRG_PK);
  const order = params.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  const { where, bindings } = buildWhere(params, JOUEURRG_SEARCH_COLS, JOUEURRG_FILTER_COLS);

  const row = await dbGet<{ total: number }>(
    `SELECT COUNT(*) AS total FROM "${JOUEURRG_TABLE}" ${where}`,
    bindings,
  );
  const total = row?.total ?? 0;

  const data = await dbAll(
    `SELECT ${JOUEURRG_SELECT_SQL}
     FROM "${JOUEURRG_TABLE}" ${where}
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

async function getJoueurRgById(id: string | number): Promise<Record<string, unknown> | undefined> {
  return dbGet<Record<string, unknown>>(
    `SELECT ${JOUEURRG_SELECT_SQL}
     FROM "${JOUEURRG_TABLE}"
     WHERE "${JOUEURRG_PK}" = ?`,
    [id],
  );
}

async function createJoueurRg(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const keys = Object.keys(body);
  if (!keys.length) {
    throw new AppError(400, 'No fields provided');
  }

  const cols = keys.map((key) => `"${key}"`).join(', ');
  const marks = keys.map(() => '?').join(', ');
  const result = await dbRun(
    `INSERT INTO "${JOUEURRG_TABLE}" (${cols}) VALUES (${marks})`,
    Object.values(body),
  );

  const explicitPkValue = body[JOUEURRG_PK];
  if (typeof explicitPkValue === 'string' || typeof explicitPkValue === 'number') {
    return getJoueurRgById(explicitPkValue);
  }
  if (typeof result.lastInsertRowid === 'string' || typeof result.lastInsertRowid === 'number') {
    return getJoueurRgById(result.lastInsertRowid);
  }

  return undefined;
}

async function updateJoueurRg(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const keys = Object.keys(body);
  if (!keys.length) {
    throw new AppError(400, 'No fields provided');
  }

  const sets = keys.map((key) => `"${key}" = ?`).join(', ');
  await dbRun(
    `UPDATE "${JOUEURRG_TABLE}" SET ${sets} WHERE "${JOUEURRG_PK}" = ?`,
    [...Object.values(body), id],
  );

  return getJoueurRgById(id);
}

function computeApproxScore(query: string, nom: string, prenom: string, surnom: string): number {
  const q = normalizeSearchText(query);
  if (!q) return 0;

  const n = normalizeSearchText(nom);
  const p = normalizeSearchText(prenom);
  const s = normalizeSearchText(surnom);
  const full = `${n}${p}`;

  let score = 0;
  if (n === q) score += 260;
  if (s === q) score += 300;
  if (full === q) score += 300;
  if (n.startsWith(q)) score += 150;
  if (p.startsWith(q)) score += 70;
  if (s.startsWith(q)) score += 180;
  if (full.startsWith(q)) score += 170;
  if (n.includes(q)) score += 100;
  if (p.includes(q)) score += 60;
  if (s.includes(q)) score += 120;
  if (full.includes(q)) score += 120;

  const distN = n ? levenshteinDistance(q, n.slice(0, Math.max(q.length + 6, 10))) : 99;
  const distS = s ? levenshteinDistance(q, s.slice(0, Math.max(q.length + 6, 10))) : 99;
  const best = Math.min(distN, distS);
  if (best <= 1) score += 130;
  else if (best === 2) score += 80;
  else if (best === 3) score += 30;

  return score;
}

export async function getJoueurSuggestions(search: string, limit = 12): Promise<{ data: JoueurSuggestionRow[] }> {
  const query = String(search ?? '').trim();
  if (!query) return { data: [] };

  const rows = await dbAll<{ IDJOUEUR: string; NOM: string; PRENOM: string; SURNOM: string; IDNATIO: string }>(
    `SELECT IDJOUEUR, NOM, PRENOM, SURNOM, IDNATIO
     FROM JOUEURRG
     ORDER BY NOM ASC, PRENOM ASC, IDJOUEUR ASC`,
  );

  const data = rows
    .map((row) => ({ ...row, SCORE: computeApproxScore(query, String(row.NOM ?? ''), String(row.PRENOM ?? ''), String(row.SURNOM ?? '')) }))
    .filter((row) => row.SCORE >= 20)
    .sort((a, b) => b.SCORE - a.SCORE || String(a.NOM).localeCompare(String(b.NOM)) || String(a.PRENOM).localeCompare(String(b.PRENOM)))
    .map((row) => ({
      IDJOUEUR: row.IDJOUEUR,
      NOM: row.NOM,
      PRENOM: row.PRENOM,
      IDNATIO: row.IDNATIO,
      SCORE: row.SCORE,
    }))
    .slice(0, Math.max(1, Math.min(limit, 30)));

  return { data };
}

async function resolveNextJoueurId(): Promise<string> {
  const row = await dbGet<{ maxId: number | null }>('SELECT MAX(CAST(IDJOUEUR AS INTEGER)) AS maxId FROM JOUEURRG');
  const nextId = Math.max(0, Number(row?.maxId ?? 0)) + 1;
  if (nextId > 9999) {
    throw new AppError(400, 'Impossible de generer un identifiant joueur (limite 9999 atteinte).');
  }
  return String(nextId).padStart(4, '0');
}

export async function createJoueurWithWizard(payload: { nom: string; prenom?: string; natioId: string; posteId: number; alias?: string }): Promise<Record<string, unknown> | undefined> {
  const nom = String(payload.nom ?? '').trim().toUpperCase();
  const prenom = String(payload.prenom ?? '').trim();
  const alias = String(payload.alias ?? '').trim();
  const natioId = String(payload.natioId ?? '').trim().toUpperCase();
  const posteId = Number(payload.posteId);

  if (!nom) throw new AppError(400, 'Nom requis.');
  if (!natioId) throw new AppError(400, 'Nationalite requise.');
  if (!Number.isInteger(posteId) || posteId <= 0) throw new AppError(400, 'Poste requis.');

  const country = await dbGet<{ IDNATIO: string }>('SELECT IDNATIO FROM NATIO WHERE IDNATIO = ?', [natioId]);
  if (!country) {
    throw new AppError(400, 'Le pays selectionne est introuvable.');
  }

  const poste = await dbGet<{ POS_ID: number }>('SELECT POS_ID FROM Poste WHERE POS_ID = ? AND POS_TYPE = 1', [posteId]);
  if (!poste) {
    throw new AppError(400, 'Le poste selectionne est introuvable.');
  }

  const idJoueur = await resolveNextJoueurId();

  await dbRun(
    `INSERT INTO JOUEURRG (
      IDJOUEUR, NOM, PRENOM, NAISSANCE, IDNATIO, POSTE, BUT, PASSE, JAUNE, ROUGE,
      REMP, TITULAIRE, SURNOM, COMMENT, ENTRAINE, IDVILLE, APPARITION
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      idJoueur,
      nom.slice(0, 30),
      prenom.slice(0, 20),
      null,
      natioId,
      posteId,
      0,
      0,
      0,
      0,
      0,
      0,
      alias.slice(0, 20),
      '',
      0,
      null,
      0,
    ],
  );

  return getJoueurByIdWithVille(idJoueur);
}

export async function getJoueurPostes(): Promise<PosteOption[]> {
  return dbAll<PosteOption>(
    `SELECT POS_ID, POS_NOM
     FROM Poste
     WHERE POS_TYPE = 1
     ORDER BY POS_NOM ASC, POS_ID ASC`,
  );
}

export async function getJoueurByIdWithVille(
  id: string | number,
): Promise<Record<string, unknown> | undefined> {
  return dbGet<Record<string, unknown>>(
    `SELECT
      ${JOUEURRG_SELECT_SQL_WITH_ALIAS},
      vb.NOM AS VILLE_NOM,
      vd.NOM AS VILLE_DECES_NOM
     FROM JOUEURRG jr
     LEFT JOIN VILLE vb ON vb.VICLEUNIK = jr.IDVILLE
     LEFT JOIN VILLE vd ON vd.VICLEUNIK = jr.VILLE_DECES
     WHERE jr.IDJOUEUR = ?`,
    [id],
  );
}

export async function getJoueursGridBySeason(season: string, search: string): Promise<JoueurGridRow[]> {
  const normalizedSearch = search.trim().toLowerCase();
  const likeSearch = `%${normalizedSearch}%`;

  return dbAll<JoueurGridRow>(
    `SELECT
      j.JOCLEUNIK,
      j.IDJOUEUR,
      j.SAISON,
      j.POSTE,
      COALESCE(
        NULLIF(TRIM(jr.SURNOM), ''),
        TRIM(UPPER(COALESCE(jr.NOM, '')) || ' ' || COALESCE(jr.PRENOM, ''))
      ) AS JOUEUR_NOM,
      p.POS_NOM AS POSTE_NOM,
      tx.SAISON AS LAST_TRANSAC_SAISON,
      tx.STATUT AS LAST_TRANSAC_STATUT,
      tx.TYPE AS LAST_TRANSAC_TYPE
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
     INNER JOIN Poste p ON p.POS_ID = j.POSTE
     LEFT JOIN (
       SELECT t1.IDJOUEUR, t1.SAISON, t1.STATUT, t1.TYPE
       FROM TRANSAC t1
       INNER JOIN (
         SELECT IDJOUEUR, MAX(DATE || '-' || printf('%010d', TNCLEUNIK)) AS latest_key
         FROM TRANSAC
         GROUP BY IDJOUEUR
       ) latest
         ON latest.IDJOUEUR = t1.IDJOUEUR
        AND (t1.DATE || '-' || printf('%010d', t1.TNCLEUNIK)) = latest.latest_key
     ) tx ON tx.IDJOUEUR = j.IDJOUEUR
     WHERE j.SAISON = ?
       AND p.POS_TYPE = 1
       AND (
         ? = ''
         OR LOWER(COALESCE(jr.SURNOM, '')) LIKE ?
         OR LOWER(COALESCE(jr.NOM, '')) LIKE ?
         OR LOWER(COALESCE(jr.PRENOM, '')) LIKE ?
         OR LOWER(COALESCE(p.POS_NOM, '')) LIKE ?
       )
     ORDER BY JOUEUR_NOM ASC, j.JOCLEUNIK ASC`,
    [season, normalizedSearch, likeSearch, likeSearch, likeSearch, likeSearch],
  );
}

export async function getJoueurHistoryById(idJoueur: string | number): Promise<JoueurHistoryRow[]> {
  return dbAll<JoueurHistoryRow>(
    `SELECT
      j.JOCLEUNIK,
      j.SAISON,
      j.POSTE,
      COALESCE(p.POS_NOM, '') AS POSTE_NOM,
      COALESCE(j.TITULAIRETOTAL, 0) AS TITULAIRETOTAL,
      COALESCE(j.REMPTOTAL, 0) AS REMPTOTAL,
      COALESCE(j.BUTTOTAL, 0) AS BUTTOTAL,
      COALESCE(j.PASSETOTAL, 0) AS PASSETOTAL,
      COALESCE(j.JAUNETOTAL, 0) AS JAUNETOTAL,
      COALESCE(j.ROUGETOTAL, 0) AS ROUGETOTAL
     FROM JOUEUR j
     LEFT JOIN Poste p ON p.POS_ID = j.POSTE
     WHERE j.IDJOUEUR = ?
     ORDER BY j.SAISON DESC, j.JOCLEUNIK DESC`,
    [idJoueur],
  );
}

export async function createJoueurHistoryById(
  idJoueur: string | number,
  payload: { saison: string; poste: number | string },
): Promise<JoueurHistoryRow | undefined> {
  const joueurId = String(idJoueur ?? '').trim();
  if (!joueurId) {
    throw new AppError(400, 'Identifiant joueur invalide.');
  }

  const joueur = await dbGet<{ IDJOUEUR: string }>('SELECT IDJOUEUR FROM JOUEURRG WHERE IDJOUEUR = ?', [joueurId]);
  if (!joueur) {
    return undefined;
  }

  const saison = normalizeSaison(payload.saison);
  const posteId = await normalizePosteJoueur(payload.poste);

  const existing = await dbGet<{ JOCLEUNIK: number }>(
    'SELECT JOCLEUNIK FROM JOUEUR WHERE IDJOUEUR = ? AND SAISON = ? LIMIT 1',
    [joueurId, saison],
  );
  if (existing) {
    throw new AppError(400, 'Une ligne existe deja pour cette saison.');
  }

  await dbRun(
    `INSERT INTO JOUEUR (
      IDJOUEUR, SAISON, INTERNATIONAL, BUTTOTAL, POSTE, PASSETOTAL,
      JAUNETOTAL, ROUGETOTAL, TITULAIRETOTAL, REMPTOTAL, TEMPSTOTAL
    ) VALUES (?, ?, 0, 0, ?, 0, 0, 0, 0, 0, 0)`,
    [joueurId, saison, posteId],
  );

  return dbGet<JoueurHistoryRow>(
    `SELECT
      j.JOCLEUNIK,
      j.SAISON,
      j.POSTE,
      COALESCE(p.POS_NOM, '') AS POSTE_NOM,
      COALESCE(j.TITULAIRETOTAL, 0) AS TITULAIRETOTAL,
      COALESCE(j.REMPTOTAL, 0) AS REMPTOTAL,
      COALESCE(j.BUTTOTAL, 0) AS BUTTOTAL,
      COALESCE(j.PASSETOTAL, 0) AS PASSETOTAL,
      COALESCE(j.JAUNETOTAL, 0) AS JAUNETOTAL,
      COALESCE(j.ROUGETOTAL, 0) AS ROUGETOTAL
     FROM JOUEUR j
     LEFT JOIN Poste p ON p.POS_ID = j.POSTE
     WHERE j.IDJOUEUR = ? AND j.SAISON = ?
     ORDER BY j.JOCLEUNIK DESC
     LIMIT 1`,
    [joueurId, saison],
  );
}

export async function updateJoueurHistoryById(
  idJoueur: string | number,
  historyId: string,
  payload: { saison: string; poste: number | string },
): Promise<JoueurHistoryRow | undefined> {
  const joueurId = String(idJoueur ?? '').trim();
  const rowId = Number(historyId);

  if (!joueurId) {
    throw new AppError(400, 'Identifiant joueur invalide.');
  }
  if (!Number.isInteger(rowId) || rowId <= 0) {
    throw new AppError(400, 'Identifiant historique invalide.');
  }

  const existing = await dbGet<{ JOCLEUNIK: number }>(
    'SELECT JOCLEUNIK FROM JOUEUR WHERE JOCLEUNIK = ? AND IDJOUEUR = ? LIMIT 1',
    [rowId, joueurId],
  );
  if (!existing) {
    return undefined;
  }

  const saison = normalizeSaison(payload.saison);
  const posteId = await normalizePosteJoueur(payload.poste);

  const duplicate = await dbGet<{ JOCLEUNIK: number }>(
    'SELECT JOCLEUNIK FROM JOUEUR WHERE IDJOUEUR = ? AND SAISON = ? AND JOCLEUNIK <> ? LIMIT 1',
    [joueurId, saison, rowId],
  );
  if (duplicate) {
    throw new AppError(400, 'Une ligne existe deja pour cette saison.');
  }

  await dbRun(
    `UPDATE JOUEUR
     SET SAISON = ?, POSTE = ?
     WHERE JOCLEUNIK = ? AND IDJOUEUR = ?`,
    [saison, posteId, rowId, joueurId],
  );

  return dbGet<JoueurHistoryRow>(
    `SELECT
      j.JOCLEUNIK,
      j.SAISON,
      j.POSTE,
      COALESCE(p.POS_NOM, '') AS POSTE_NOM,
      COALESCE(j.TITULAIRETOTAL, 0) AS TITULAIRETOTAL,
      COALESCE(j.REMPTOTAL, 0) AS REMPTOTAL,
      COALESCE(j.BUTTOTAL, 0) AS BUTTOTAL,
      COALESCE(j.PASSETOTAL, 0) AS PASSETOTAL,
      COALESCE(j.JAUNETOTAL, 0) AS JAUNETOTAL,
      COALESCE(j.ROUGETOTAL, 0) AS ROUGETOTAL
     FROM JOUEUR j
     LEFT JOIN Poste p ON p.POS_ID = j.POSTE
     WHERE j.JOCLEUNIK = ? AND j.IDJOUEUR = ?
     LIMIT 1`,
    [rowId, joueurId],
  );
}

export async function deleteJoueurHistoryById(idJoueur: string | number, historyId: string): Promise<boolean> {
  const joueurId = String(idJoueur ?? '').trim();
  const rowId = Number(historyId);

  if (!joueurId) {
    throw new AppError(400, 'Identifiant joueur invalide.');
  }
  if (!Number.isInteger(rowId) || rowId <= 0) {
    throw new AppError(400, 'Identifiant historique invalide.');
  }

  const result = await dbRun('DELETE FROM JOUEUR WHERE JOCLEUNIK = ? AND IDJOUEUR = ?', [rowId, joueurId]);
  return result.changes > 0;
}

function normalizeSaison(value: unknown): string {
  const saison = String(value ?? '').trim();
  if (!/^\d{4}-\d{4}$/.test(saison)) {
    throw new AppError(400, 'Saison invalide (format xxxx-yyyy).');
  }
  return saison;
}

async function normalizePosteJoueur(value: unknown): Promise<number> {
  const posteId = Number(value);
  if (!Number.isInteger(posteId) || posteId <= 0) {
    throw new AppError(400, 'Poste invalide.');
  }

  const poste = await dbGet<{ POS_ID: number }>('SELECT POS_ID FROM Poste WHERE POS_ID = ? AND POS_TYPE = 1', [posteId]);
  if (!poste) {
    throw new AppError(400, 'Le poste selectionne est introuvable.');
  }
  return posteId;
}

export default {
  ...baseService,
  getAll: getJoueurRgAll,
  getById: getJoueurRgById,
  create: createJoueurRg,
  update: updateJoueurRg,
  getJoueursGridBySeason,
  getJoueurPostes,
  getJoueurByIdWithVille,
  getJoueurHistoryById,
  createJoueurHistoryById,
  updateJoueurHistoryById,
  deleteJoueurHistoryById,
  getJoueurSuggestions,
  createJoueurWithWizard,
};
