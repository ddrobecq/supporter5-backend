import { dbAll, dbGet, dbRun } from '../config/database';
import { createEntityService } from '../lib/baseService';
import { buildWhere, sanitizeSort } from '../lib/queryBuilder';
import { levenshteinDistance, normalizeSearchText } from '../lib/searchUtils';
import { normalizeSaison } from '../lib/saisonRules';
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
  'HAUTEUR',
  'POIDS',
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
  POS_TYPE?: number;
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

export interface JoueurTransactionRow {
  TNCLEUNIK: number;
  DATE: string;
  SAISON: string;
  TYPE: number;
  STATUT: number;
  IDCLUB: string | null;
  CLUB_NOM: string;
  CLUB_IDNATIO: string | null;
  SALAIRE: number | null;
  INDEMNITES: number | null;
  DVCLEUNIK: number;
  DEVISE_SYMBOLE: string;
  TN_ECHEANCE: string | null;
  TYT_LIBELLE: string;
  TYT_STATUT: number | null;
  TYT_CLUB: number | null;
  TYT_PHRASE_DEPART: string | null;
  TYT_PHRASE_ARRIVEE: string | null;
  TYT_PHRASE_NEUTRE: string | null;
}

export interface JoueurTransactionTypeOption {
  TYT_CLEUNIK: number;
  TYT_LIBELLE: string;
  TYT_VISIBLE: number;
  TYT_STATUT: number;
  TYT_SALAIRE: number | null;
  TYT_CLUB: number;
  TYT_INDEMNITES: number;
  TYT_ECHEANCE: number;
  TYT_PHRASE_DEPART: string | null;
  TYT_PHRASE_ARRIVEE: string | null;
  TYT_PHRASE_NEUTRE: string | null;
}

export interface JoueurTransactionDeviseOption {
  DVCLEUNIK: number;
  NOM: string;
  SYMBOLE: string;
  DVDEFAUT: number;
}

export interface JoueurTransactionOptions {
  types: JoueurTransactionTypeOption[];
  devises: JoueurTransactionDeviseOption[];
  defaultDeviseId: number | null;
}

export interface JoueurMatchEvent {
  type: 'but' | 'passe' | 'entree' | 'sortie' | 'blessure';
  minute: number;
  periode: number;
}

export interface JoueurMatchRow {
  RECLEUNIK: number;
  DATE: string;
  DOMICILE: string;
  EXTERIEUR: string;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  ETAT: number;
  TOUR_NOM: string;
  COMPET_NOM: string;
  COCLEUNIK: number;
  SAISON: string;
  POSTE_NOM: string | null;
  PARTICIPATION_TYPE: 'titulaire' | 'remplacant';
  events: JoueurMatchEvent[];
}

interface JoueurTransactionUpsertPayload {
  date: string;
  type: number | string;
  statut?: number | string;
  idClub?: string | null;
  salaire?: number | string | null;
  indemnites?: number | string | null;
  deviseId: number | string;
  echeance?: string | null;
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
    `SELECT POS_ID, POS_NOM, POS_TYPE
     FROM Poste
     ORDER BY POS_TYPE ASC, POS_NOM ASC, POS_ID ASC`,
  );
}

export interface PosteOption {
  POS_ID: number;
  POS_NOM: string;
  POS_TYPE?: number;
}

export async function getJoueurByIdWithVille(id: string | number): Promise<Record<string, unknown> | undefined> {
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

export async function getJoueursGridBySeason(season: string, search: string, posType = 1): Promise<JoueurGridRow[]> {
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
       AND p.POS_TYPE = ?
       AND (
         ? = ''
         OR LOWER(COALESCE(jr.SURNOM, '')) LIKE ?
         OR LOWER(COALESCE(jr.NOM, '')) LIKE ?
         OR LOWER(COALESCE(jr.PRENOM, '')) LIKE ?
         OR LOWER(COALESCE(p.POS_NOM, '')) LIKE ?
       )
     ORDER BY JOUEUR_NOM ASC, j.JOCLEUNIK ASC`,
    [season, posType, normalizedSearch, likeSearch, likeSearch, likeSearch, likeSearch],
  );
}

export interface JoueurSeasonWizardRow {
  JOCLEUNIK: number;
  IDJOUEUR: string;
  NOM: string | null;
  PRENOM: string | null;
  SURNOM: string | null;
  IDNATIO: string | null;
  JOUEUR_NOM: string;
  POSTE: number;
  POSTE_NOM: string;
  CONTRAT_FIN: string | null;
}

/** Effectif joueurs (POS_TYPE=1) d'une saison, avec la derniere date de fin de contrat connue (TRANSAC.TN_ECHEANCE). Utilise par le wizard de creation de saison. */
export async function getJoueurRosterForSeasonWizard(season: string): Promise<JoueurSeasonWizardRow[]> {
  const normalizedSeason = normalizeSaison(season);

  return dbAll<JoueurSeasonWizardRow>(
    `SELECT
      j.JOCLEUNIK,
      j.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      COALESCE(
        NULLIF(TRIM(jr.SURNOM), ''),
        TRIM(UPPER(COALESCE(jr.NOM, '')) || ' ' || COALESCE(jr.PRENOM, ''))
      ) AS JOUEUR_NOM,
      j.POSTE,
      p.POS_NOM AS POSTE_NOM,
      tx.TN_ECHEANCE AS CONTRAT_FIN
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
     INNER JOIN Poste p ON p.POS_ID = j.POSTE
     LEFT JOIN (
       SELECT t1.IDJOUEUR, t1.TN_ECHEANCE
       FROM TRANSAC t1
       INNER JOIN (
         SELECT IDJOUEUR, MAX(DATE || '-' || printf('%010d', TNCLEUNIK)) AS latest_key
         FROM TRANSAC
         WHERE TN_ECHEANCE IS NOT NULL AND TRIM(TN_ECHEANCE) <> ''
         GROUP BY IDJOUEUR
       ) latest ON latest.IDJOUEUR = t1.IDJOUEUR
        AND (t1.DATE || '-' || printf('%010d', t1.TNCLEUNIK)) = latest.latest_key
     ) tx ON tx.IDJOUEUR = j.IDJOUEUR
     WHERE j.SAISON = ?
       AND p.POS_TYPE = 1
     ORDER BY JOUEUR_NOM ASC, j.JOCLEUNIK ASC`,
    [normalizedSeason],
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

export async function getJoueurTransactionsById(idJoueur: string | number): Promise<JoueurTransactionRow[]> {
  const joueurId = String(idJoueur ?? '').trim();
  if (!joueurId) {
    throw new AppError(400, 'Identifiant joueur invalide.');
  }

  return dbAll<JoueurTransactionRow>(
    `SELECT
      t.TNCLEUNIK,
      t.DATE,
      t.SAISON,
      t.TYPE,
      t.STATUT,
      t.IDCLUB,
      COALESCE(c.CLUB, '') AS CLUB_NOM,
      c.IDNATIO AS CLUB_IDNATIO,
      t.SALAIRE,
      t.INDEMNITES,
      t.DVCLEUNIK,
      COALESCE(d.SYMBOLE, '') AS DEVISE_SYMBOLE,
      t.TN_ECHEANCE,
      COALESCE(tt.TYT_LIBELLE, '') AS TYT_LIBELLE,
      tt.TYT_STATUT,
      tt.TYT_CLUB,
      tt.TYT_PHRASE_DEPART,
      tt.TYT_PHRASE_ARRIVEE,
      tt.TYT_PHRASE_NEUTRE
     FROM TRANSAC t
     LEFT JOIN CLUB c ON c.IDCLUB = t.IDCLUB
     LEFT JOIN DEVISE d ON d.DVCLEUNIK = t.DVCLEUNIK
     LEFT JOIN TYPE_TRANSACTION tt ON tt.TYT_CLEUNIK = t.TYPE
     WHERE t.IDJOUEUR = ?
     ORDER BY t.DATE DESC, t.TNCLEUNIK DESC`,
    [joueurId],
  );
}

function normalizeJoueurId(idJoueur: string | number): string {
  const joueurId = String(idJoueur ?? '').trim();
  if (!joueurId) {
    throw new AppError(400, 'Identifiant joueur invalide.');
  }
  return joueurId;
}

function normalizeTransactionId(transactionId: string | number): number {
  const rowId = Number(transactionId);
  if (!Number.isInteger(rowId) || rowId <= 0) {
    throw new AppError(400, 'Identifiant transaction invalide.');
  }
  return rowId;
}

function normalizeIsoDate(value: unknown, fieldName: string): string {
  const text = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new AppError(400, `${fieldName} invalide (format yyyy-mm-dd).`);
  }
  return text;
}

function normalizeOptionalIsoDate(value: unknown): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new AppError(400, 'Date d echeance invalide (format yyyy-mm-dd).');
  }
  return text;
}

function seasonFromDate(isoDate: string): string {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const startYear = month >= 7 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

function normalizeOptionalClubId(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text ? text : null;
}

function normalizeMoney(value: unknown, fieldName: string, allowNull: boolean): number | null {
  const text = String(value ?? '').trim();
  if (!text) {
    return allowNull ? null : 0;
  }
  const amount = Number(text.replace(',', '.'));
  if (!Number.isFinite(amount) || amount < 0) {
    throw new AppError(400, `${fieldName} invalide.`);
  }
  return amount;
}

function normalizeDeviseId(value: unknown): number {
  const deviseId = Number(value);
  if (!Number.isInteger(deviseId) || deviseId <= 0) {
    throw new AppError(400, 'Devise invalide.');
  }
  return deviseId;
}

function resolveTransactionStatut(transactionType: JoueurTransactionTypeOption, payloadStatut: unknown): number {
  const typeStatut = Number(transactionType.TYT_STATUT);
  const defaultStatut = typeStatut === 1 || typeStatut === 2 || typeStatut === 3 ? typeStatut : 3;
  const statut = Number(payloadStatut);
  return statut === 1 || statut === 2 || statut === 3 ? statut : defaultStatut;
}

async function getTransactionTypeById(typeId: number): Promise<JoueurTransactionTypeOption> {
  const type = await dbGet<JoueurTransactionTypeOption>(
    `SELECT
      TYT_CLEUNIK,
      TYT_LIBELLE,
      TYT_VISIBLE,
      TYT_STATUT,
      TYT_SALAIRE,
      TYT_CLUB,
      TYT_INDEMNITES,
      TYT_ECHEANCE,
      TYT_PHRASE_DEPART,
      TYT_PHRASE_ARRIVEE,
      TYT_PHRASE_NEUTRE
     FROM TYPE_TRANSACTION
     WHERE TYT_CLEUNIK = ?`,
    [typeId],
  );
  if (!type) {
    throw new AppError(400, 'Type de transaction introuvable.');
  }
  return type;
}

async function ensureJoueurExists(joueurId: string): Promise<void> {
  const joueur = await dbGet<{ IDJOUEUR: string }>('SELECT IDJOUEUR FROM JOUEURRG WHERE IDJOUEUR = ?', [joueurId]);
  if (!joueur) {
    throw new AppError(404, 'Joueur introuvable.');
  }
}

async function ensureClubExists(clubId: string): Promise<void> {
  const club = await dbGet<{ IDCLUB: string }>('SELECT IDCLUB FROM CLUB WHERE IDCLUB = ?', [clubId]);
  if (!club) {
    throw new AppError(400, 'Club introuvable.');
  }
}

async function ensureDeviseExists(deviseId: number): Promise<void> {
  const devise = await dbGet<{ DVCLEUNIK: number }>('SELECT DVCLEUNIK FROM DEVISE WHERE DVCLEUNIK = ?', [deviseId]);
  if (!devise) {
    throw new AppError(400, 'Devise introuvable.');
  }
}

async function getJoueurTransactionById(idJoueur: string, transactionId: number): Promise<JoueurTransactionRow | undefined> {
  return dbGet<JoueurTransactionRow>(
    `SELECT
      t.TNCLEUNIK,
      t.DATE,
      t.SAISON,
      t.TYPE,
      t.STATUT,
      t.IDCLUB,
      COALESCE(c.CLUB, '') AS CLUB_NOM,
      c.IDNATIO AS CLUB_IDNATIO,
      t.SALAIRE,
      t.INDEMNITES,
      t.DVCLEUNIK,
      COALESCE(d.SYMBOLE, '') AS DEVISE_SYMBOLE,
      t.TN_ECHEANCE,
      COALESCE(tt.TYT_LIBELLE, '') AS TYT_LIBELLE,
      tt.TYT_STATUT,
      tt.TYT_CLUB,
      tt.TYT_PHRASE_DEPART,
      tt.TYT_PHRASE_ARRIVEE,
      tt.TYT_PHRASE_NEUTRE
     FROM TRANSAC t
     LEFT JOIN CLUB c ON c.IDCLUB = t.IDCLUB
     LEFT JOIN DEVISE d ON d.DVCLEUNIK = t.DVCLEUNIK
     LEFT JOIN TYPE_TRANSACTION tt ON tt.TYT_CLEUNIK = t.TYPE
     WHERE t.IDJOUEUR = ? AND t.TNCLEUNIK = ?
     LIMIT 1`,
    [idJoueur, transactionId],
  );
}

export async function getJoueurTransactionOptions(_idJoueur: string | number): Promise<JoueurTransactionOptions> {
  const types = await dbAll<JoueurTransactionTypeOption>(
    `SELECT
      TYT_CLEUNIK,
      TYT_LIBELLE,
      TYT_VISIBLE,
      TYT_STATUT,
      TYT_SALAIRE,
      TYT_CLUB,
      TYT_INDEMNITES,
      TYT_ECHEANCE,
      TYT_PHRASE_DEPART,
      TYT_PHRASE_ARRIVEE,
      TYT_PHRASE_NEUTRE
     FROM TYPE_TRANSACTION
     ORDER BY TYT_STATUT ASC, TYT_LIBELLE ASC, TYT_CLEUNIK ASC`,
  );

  const devises = await dbAll<JoueurTransactionDeviseOption>(
    `SELECT DVCLEUNIK, NOM, SYMBOLE, DVDEFAUT
     FROM DEVISE
     ORDER BY DVDEFAUT DESC, NOM ASC, DVCLEUNIK ASC`,
  );

  return {
    types,
    devises,
    defaultDeviseId: devises.find((devise) => Number(devise.DVDEFAUT) !== 0)?.DVCLEUNIK ?? devises[0]?.DVCLEUNIK ?? null,
  };
}

export async function createJoueurTransactionById(
  idJoueur: string | number,
  payload: JoueurTransactionUpsertPayload,
): Promise<JoueurTransactionRow> {
  const joueurId = normalizeJoueurId(idJoueur);
  await ensureJoueurExists(joueurId);

  const date = normalizeIsoDate(payload.date, 'Date');
  const season = seasonFromDate(date);
  const typeId = Number(payload.type);
  if (!Number.isInteger(typeId) || typeId <= 0) {
    throw new AppError(400, 'Type de transaction invalide.');
  }

  const transactionType = await getTransactionTypeById(typeId);
  const statut = resolveTransactionStatut(transactionType, payload.statut);

  const clubId = normalizeOptionalClubId(payload.idClub);
  if (Number(transactionType.TYT_CLUB) !== 0) {
    if (!clubId) {
      throw new AppError(400, 'Le club est requis pour ce type de transaction.');
    }
    await ensureClubExists(clubId);
  }

  const deviseId = normalizeDeviseId(payload.deviseId);
  await ensureDeviseExists(deviseId);

  const salaire = Number(transactionType.TYT_SALAIRE ?? 0) !== 0
    ? normalizeMoney(payload.salaire, 'Salaire', true)
    : null;

  const indemnites = Number(transactionType.TYT_INDEMNITES ?? 0) !== 0
    ? normalizeMoney(payload.indemnites, 'Indemnites', false) ?? 0
    : 0;

  const echeance = Number(transactionType.TYT_ECHEANCE ?? 0) !== 0
    ? normalizeOptionalIsoDate(payload.echeance)
    : null;

  if (Number(transactionType.TYT_ECHEANCE ?? 0) !== 0 && !echeance) {
    throw new AppError(400, 'La date d echeance est requise pour ce type de transaction.');
  }

  await dbRun(
    `INSERT INTO TRANSAC (
      DATE, TYPE, SALAIRE, IDCLUB, SAISON, IDJOUEUR, STATUT, INDEMNITES, DVCLEUNIK, TN_ECHEANCE
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      date,
      typeId,
      salaire,
      Number(transactionType.TYT_CLUB) !== 0 ? clubId : null,
      season,
      joueurId,
      statut,
      indemnites,
      deviseId,
      echeance,
    ],
  );

  const inserted = await dbGet<{ TNCLEUNIK: number }>(
    `SELECT TNCLEUNIK
     FROM TRANSAC
     WHERE IDJOUEUR = ?
     ORDER BY TNCLEUNIK DESC
     LIMIT 1`,
    [joueurId],
  );

  if (!inserted) {
    throw new AppError(500, 'Création de transaction échouée.');
  }

  const row = await getJoueurTransactionById(joueurId, inserted.TNCLEUNIK);
  if (!row) {
    throw new AppError(500, 'Transaction créée mais introuvable.');
  }
  return row;
}

export async function updateJoueurTransactionById(
  idJoueur: string | number,
  transactionId: string | number,
  payload: JoueurTransactionUpsertPayload,
): Promise<JoueurTransactionRow | undefined> {
  const joueurId = normalizeJoueurId(idJoueur);
  const rowId = normalizeTransactionId(transactionId);
  await ensureJoueurExists(joueurId);

  const existing = await dbGet<{ TNCLEUNIK: number }>(
    'SELECT TNCLEUNIK FROM TRANSAC WHERE IDJOUEUR = ? AND TNCLEUNIK = ? LIMIT 1',
    [joueurId, rowId],
  );
  if (!existing) {
    return undefined;
  }

  const date = normalizeIsoDate(payload.date, 'Date');
  const season = seasonFromDate(date);
  const typeId = Number(payload.type);
  if (!Number.isInteger(typeId) || typeId <= 0) {
    throw new AppError(400, 'Type de transaction invalide.');
  }

  const transactionType = await getTransactionTypeById(typeId);
  const statut = resolveTransactionStatut(transactionType, payload.statut);

  const clubId = normalizeOptionalClubId(payload.idClub);
  if (Number(transactionType.TYT_CLUB) !== 0) {
    if (!clubId) {
      throw new AppError(400, 'Le club est requis pour ce type de transaction.');
    }
    await ensureClubExists(clubId);
  }

  const deviseId = normalizeDeviseId(payload.deviseId);
  await ensureDeviseExists(deviseId);

  const salaire = Number(transactionType.TYT_SALAIRE ?? 0) !== 0
    ? normalizeMoney(payload.salaire, 'Salaire', true)
    : null;

  const indemnites = Number(transactionType.TYT_INDEMNITES ?? 0) !== 0
    ? normalizeMoney(payload.indemnites, 'Indemnites', false) ?? 0
    : 0;

  const echeance = Number(transactionType.TYT_ECHEANCE ?? 0) !== 0
    ? normalizeOptionalIsoDate(payload.echeance)
    : null;

  if (Number(transactionType.TYT_ECHEANCE ?? 0) !== 0 && !echeance) {
    throw new AppError(400, 'La date d echeance est requise pour ce type de transaction.');
  }

  await dbRun(
    `UPDATE TRANSAC
     SET DATE = ?, TYPE = ?, SALAIRE = ?, IDCLUB = ?, SAISON = ?, STATUT = ?, INDEMNITES = ?, DVCLEUNIK = ?, TN_ECHEANCE = ?
     WHERE IDJOUEUR = ? AND TNCLEUNIK = ?`,
    [
      date,
      typeId,
      salaire,
      Number(transactionType.TYT_CLUB) !== 0 ? clubId : null,
      season,
      statut,
      indemnites,
      deviseId,
      echeance,
      joueurId,
      rowId,
    ],
  );

  return getJoueurTransactionById(joueurId, rowId);
}

export async function deleteJoueurTransactionById(idJoueur: string | number, transactionId: string | number): Promise<boolean> {
  const joueurId = normalizeJoueurId(idJoueur);
  const rowId = normalizeTransactionId(transactionId);

  const result = await dbRun('DELETE FROM TRANSAC WHERE IDJOUEUR = ? AND TNCLEUNIK = ?', [joueurId, rowId]);
  return result.changes > 0;
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

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
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

export async function getJoueurSeasonsByPlayedMatches(joueurId: string): Promise<string[]> {
  const id = normalizeText(joueurId);
  if (!id) {
    throw new AppError(400, 'Identifiant joueur invalide.');
  }

  // Get seasons from player history (JOUEUR table)
  const rows = await dbAll<{ SAISON: string }>(
    `SELECT DISTINCT j.SAISON
     FROM JOUEUR j
     WHERE j.IDJOUEUR = ?
       AND COALESCE(j.SAISON, '') != ''
     ORDER BY j.SAISON DESC`,
    [id],
  );

  return rows.map((row) => row.SAISON).filter((s) => s.length > 0);
}

export async function getJoueurMatchesForSeason(
  joueurId: string,
  saison: string,
): Promise<JoueurMatchRow[]> {
  const id = normalizeText(joueurId);
  const season = normalizeSaison(saison);

  if (!id) {
    throw new AppError(400, 'Identifiant joueur invalide.');
  }

  // EQUIPE has one column per position (GOAL, DLG, ..., AVC) - no IDJOUEUR column
  const POS_COLS = 'e.GOAL=? OR e.DLG=? OR e.DLD=? OR e.DCG=? OR e.DCD=? OR e.LIB=? OR e.STO=? OR e.MDLD=? OR e.MDLG=? OR e.MDCD=? OR e.MDCG=? OR e.MOLD=? OR e.MOLG=? OR e.MOCD=? OR e.MOCG=? OR e.MOCC=? OR e.MDCC=? OR e.ALD=? OR e.ALG=? OR e.ACD=? OR e.ACG=? OR e.AVC=?';
  const posParams = Array(22).fill(id) as string[];

  const rawRows = await dbAll<{
    RECLEUNIK: number;
    DATE: string;
    DOMICILE: string;
    EXTERIEUR: string;
    DOMICILE_NOM: string;
    EXTERIEUR_NOM: string;
    BUTDOM: number;
    BUTEXT: number;
    TABDOM: number;
    TABEXT: number;
    ETAT: number;
    TOUR_NOM: string;
    COMPET_NOM: string;
    COCLEUNIK: number;
    SAISON: string;
    POSTE_NOM: string | null;
    PARTICIPATION_TYPE: 'titulaire' | 'remplacant';
    EVENTS_JSON: string;
  }>(
    `SELECT
       matches.RECLEUNIK, matches.DATE, matches.DOMICILE, matches.EXTERIEUR,
       matches.DOMICILE_NOM, matches.EXTERIEUR_NOM,
       matches.BUTDOM, matches.BUTEXT, matches.TABDOM, matches.TABEXT, matches.ETAT,
       matches.TOUR_NOM, matches.COMPET_NOM, matches.COCLEUNIK, matches.SAISON,
       matches.POSTE_NOM, matches.PARTICIPATION_TYPE,
       COALESCE((
         SELECT json_group_array(json_object('type', evo.etype, 'minute', evo.minute, 'periode', evo.periode))
         FROM (
           SELECT
             CASE
               WHEN ev.TYPE_EVENT = 1 AND ev.JOUEUR1 = ? THEN 'but'
               WHEN ev.TYPE_EVENT = 1 AND ev.JOUEUR2 = ? THEN 'passe'
               WHEN ev.TYPE_EVENT = 2 AND ev.JOUEUR2 = ? THEN 'entree'
               WHEN ev.TYPE_EVENT = 2 AND ev.JOUEUR1 = ? THEN 'sortie'
               WHEN ev.TYPE_EVENT = 3 AND ev.JOUEUR1 = ? THEN 'avertissement'
               WHEN ev.TYPE_EVENT = 4 AND ev.JOUEUR1 = ? THEN 'second-avertissement'
               WHEN ev.TYPE_EVENT = 5 AND ev.JOUEUR1 = ? THEN 'exclusion'
               WHEN ev.TYPE_EVENT = 9 AND ev.JOUEUR1 = ? THEN 'blessure'
             END AS etype,
             ev.MINUTE AS minute,
             ev.PERIODE AS periode
           FROM EVENT ev
           INNER JOIN MATCH mx ON mx.MACLEUNIK = ev.MACLEUNIK
           WHERE mx.RECLEUNIK = matches.RECLEUNIK
             AND (
               (ev.TYPE_EVENT = 1 AND (ev.JOUEUR1 = ? OR ev.JOUEUR2 = ?))
               OR (ev.TYPE_EVENT = 2 AND (ev.JOUEUR1 = ? OR ev.JOUEUR2 = ?))
               OR (ev.TYPE_EVENT = 3 AND ev.JOUEUR1 = ?)
               OR (ev.TYPE_EVENT = 4 AND ev.JOUEUR1 = ?)
               OR (ev.TYPE_EVENT = 5 AND ev.JOUEUR1 = ?)
               OR (ev.TYPE_EVENT = 9 AND ev.JOUEUR1 = ?)
             )
           ORDER BY ev.PERIODE ASC, ev.MINUTE ASC
         ) evo
         WHERE evo.etype IS NOT NULL
       ), '[]') AS EVENTS_JSON
     FROM (
       SELECT
         r.RECLEUNIK,
         REPLACE(COALESCE(r.DATE, ''), '-', '') AS DATE,
         r.DOMICILE,
         r.EXTERIEUR,
         COALESCE(cd.CLUB, r.DOMICILE, '') AS DOMICILE_NOM,
         COALESCE(ce.CLUB, r.EXTERIEUR, '') AS EXTERIEUR_NOM,
         COALESCE(r.BUTDOM, 0) AS BUTDOM,
         COALESCE(r.BUTEXT, 0) AS BUTEXT,
         COALESCE(r.TABDOM, 0) AS TABDOM,
         COALESCE(r.TABEXT, 0) AS TABEXT,
         COALESCE(r.ETAT, 0) AS ETAT,
         COALESCE(tour.NOM, '') AS TOUR_NOM,
         COALESCE(co.NOM, '') AS COMPET_NOM,
         COALESCE(co.COCLEUNIK, 0) AS COCLEUNIK,
         COALESCE(r.SAISON, '') AS SAISON,
         COALESCE(p.POS_NOM, '') AS POSTE_NOM,
         'titulaire' AS PARTICIPATION_TYPE
       FROM RENCO r
       INNER JOIN MATCH m ON m.RECLEUNIK = r.RECLEUNIK
       INNER JOIN EQUIPE e ON e.MACLEUNIK = m.MACLEUNIK
       LEFT JOIN JOUEURRG jr ON jr.IDJOUEUR = ?
       LEFT JOIN Poste p ON p.POS_ID = jr.POSTE
       LEFT JOIN TOUR tour ON tour.TUCLEUNIK = r.TUCLEUNIK
       LEFT JOIN COMPET co ON co.COCLEUNIK = tour.COCLEUNIK
       LEFT JOIN CLUB cd ON cd.IDCLUB = r.DOMICILE
       LEFT JOIN CLUB ce ON ce.IDCLUB = r.EXTERIEUR
       WHERE COALESCE(r.SAISON, '') = ?
         AND (${POS_COLS})
       UNION ALL
       SELECT
         r.RECLEUNIK,
         REPLACE(COALESCE(r.DATE, ''), '-', '') AS DATE,
         r.DOMICILE,
         r.EXTERIEUR,
         COALESCE(cd.CLUB, r.DOMICILE, '') AS DOMICILE_NOM,
         COALESCE(ce.CLUB, r.EXTERIEUR, '') AS EXTERIEUR_NOM,
         COALESCE(r.BUTDOM, 0) AS BUTDOM,
         COALESCE(r.BUTEXT, 0) AS BUTEXT,
         COALESCE(r.TABDOM, 0) AS TABDOM,
         COALESCE(r.TABEXT, 0) AS TABEXT,
         COALESCE(r.ETAT, 0) AS ETAT,
         COALESCE(tour.NOM, '') AS TOUR_NOM,
         COALESCE(co.NOM, '') AS COMPET_NOM,
         COALESCE(co.COCLEUNIK, 0) AS COCLEUNIK,
         COALESCE(r.SAISON, '') AS SAISON,
         '' AS POSTE_NOM,
         'remplacant' AS PARTICIPATION_TYPE
       FROM RENCO r
       INNER JOIN MATCH m ON m.RECLEUNIK = r.RECLEUNIK
       INNER JOIN EVENT ev ON ev.MACLEUNIK = m.MACLEUNIK
       LEFT JOIN TOUR tour ON tour.TUCLEUNIK = r.TUCLEUNIK
       LEFT JOIN COMPET co ON co.COCLEUNIK = tour.COCLEUNIK
       LEFT JOIN CLUB cd ON cd.IDCLUB = r.DOMICILE
       LEFT JOIN CLUB ce ON ce.IDCLUB = r.EXTERIEUR
       WHERE COALESCE(r.SAISON, '') = ?
         AND ev.JOUEUR2 = ?
         AND ev.TYPE_EVENT = 2
     ) matches
     ORDER BY matches.DATE DESC`,
    [id, id, id, id, id, id, id, id, id, id, id, id, id, id, id, id, id, season, ...posParams, season, id],
  );

  const rows: JoueurMatchRow[] = rawRows.map((row) => {
    const { EVENTS_JSON, ...rest } = row;
    let events: JoueurMatchEvent[] = [];
    try {
      events = JSON.parse(EVENTS_JSON ?? '[]') as JoueurMatchEvent[];
    } catch {
      events = [];
    }
    return { ...rest, events };
  });

  return rows;
}

export default {
  ...baseService,
  getAll: getJoueurRgAll,
  getById: getJoueurRgById,
  create: createJoueurRg,
  update: updateJoueurRg,
  getJoueursGridBySeason,
  getJoueurRosterForSeasonWizard,
  getJoueurPostes,
  getJoueurByIdWithVille,
  getJoueurHistoryById,
  getJoueurTransactionsById,
  getJoueurTransactionOptions,
  createJoueurTransactionById,
  updateJoueurTransactionById,
  deleteJoueurTransactionById,
  createJoueurHistoryById,
  updateJoueurHistoryById,
  deleteJoueurHistoryById,
  getJoueurSuggestions,
  createJoueurWithWizard,
  getJoueurSeasonsByPlayedMatches,
  getJoueurMatchesForSeason,
};
