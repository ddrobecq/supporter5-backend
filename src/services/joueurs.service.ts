import { dbAll, dbGet, dbRun } from '../config/database';
import { createEntityService } from '../lib/baseService';
import { AppError } from '../types';

/** JOUEURRG = registre général des joueurs (nom, prénom, date de naissance…) */
const baseService = createEntityService({
  table:           'JOUEURRG',
  pk:              'IDJOUEUR',
  allowedSortCols: ['IDJOUEUR', 'NOM', 'PRENOM', 'NAISSANCE', 'POSTE', 'BUT', 'TITULAIRE'],
  searchCols:      ['NOM', 'PRENOM', 'SURNOM'],
  filterCols:      ['POSTE', 'IDNATIO'],
});

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

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
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
      jr.*, 
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

export default {
  ...baseService,
  getJoueursGridBySeason,
  getJoueurPostes,
  getJoueurByIdWithVille,
  getJoueurHistoryById,
  getJoueurSuggestions,
  createJoueurWithWizard,
};
