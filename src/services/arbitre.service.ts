import { createEntityService } from '../lib/baseService';
import { dbGet, dbAll } from '../config/database';
import { AppError } from '../types';

const baseService = createEntityService({
  table: 'ARBITRE',
  pk: 'IDARBITRE',
  allowedSortCols: ['IDARBITRE', 'NOM', 'PRENOM', 'IDNATIO'],
  searchCols: ['IDARBITRE', 'NOM', 'PRENOM'],
  filterCols: ['IDNATIO'],
  searchStrategy: 'backend-memory',
});

export interface ArbitreSuggestionRow {
  IDARBITRE: string;
  NOM: string;
  PRENOM: string;
  IDNATIO: string;
  SCORE: number;
}

export interface ArbitreSuggestionsResponse {
  data: ArbitreSuggestionRow[];
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

function computeApproxScore(query: string, nom: string, prenom: string): number {
  const q = normalizeSearchText(query);
  if (!q) return 0;

  const n = normalizeSearchText(nom);
  const p = normalizeSearchText(prenom);
  const full = `${n}${p}`;

  let score = 0;
  if (n === q) score += 260;
  if (p === q) score += 120;
  if (full === q) score += 300;
  if (n.startsWith(q)) score += 150;
  if (p.startsWith(q)) score += 90;
  if (full.startsWith(q)) score += 180;
  if (n.includes(q)) score += 100;
  if (p.includes(q)) score += 60;
  if (full.includes(q)) score += 120;

  const distN = n ? levenshteinDistance(q, n.slice(0, Math.max(q.length + 6, 10))) : 99;
  const distP = p ? levenshteinDistance(q, p.slice(0, Math.max(q.length + 6, 10))) : 99;
  const best = Math.min(distN, distP);
  if (best <= 1) score += 130;
  else if (best === 2) score += 80;
  else if (best === 3) score += 30;

  return score;
}

export async function getArbitreSuggestions(search: string, limit = 12): Promise<ArbitreSuggestionsResponse> {
  const query = String(search ?? '').trim();
  if (!query) return { data: [] };

  const rows = await dbAll<{ IDARBITRE: string; NOM: string; PRENOM: string; IDNATIO: string }>(
    `SELECT IDARBITRE, NOM, PRENOM, IDNATIO
     FROM ARBITRE
     ORDER BY NOM ASC, PRENOM ASC, IDARBITRE ASC`,
  );

  const data = rows
    .map((row) => ({ ...row, SCORE: computeApproxScore(query, String(row.NOM ?? ''), String(row.PRENOM ?? '')) }))
    .filter((row) => row.SCORE >= 20)
    .sort((a, b) => b.SCORE - a.SCORE || String(a.NOM).localeCompare(String(b.NOM)) || String(a.PRENOM).localeCompare(String(b.PRENOM)))
    .slice(0, Math.max(1, Math.min(limit, 30)));

  return { data };
}

export async function createArbitreWithWizard(payload: { nom: string; prenom?: string; natioId: string }): Promise<Record<string, unknown> | undefined> {
  const nom = String(payload.nom ?? '').trim().toUpperCase();
  const prenom = String(payload.prenom ?? '').trim();
  const natioId = String(payload.natioId ?? '').trim().toUpperCase();

  if (!nom) throw new AppError(400, 'Nom requis.');
  if (!natioId) throw new AppError(400, 'Nationalite requise.');

  return create({
    NOM: nom,
    PRENOM: prenom,
    IDNATIO: natioId,
  });
}

// Override create pour générer IDARBITRE automatiquement
async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const idarbitreValue = body.IDARBITRE;

  // Si IDARBITRE est vide, null, ou une string vide, générer automatiquement
  if (!idarbitreValue || (typeof idarbitreValue === 'string' && idarbitreValue.trim() === '')) {
    // Trouver le prochain ID disponible (MAX + 1, formaté en 4 chiffres)
    const result = await dbGet<{ maxId: string }>(
      'SELECT COALESCE(MAX(CAST(IDARBITRE AS INTEGER)), 0) as maxId FROM ARBITRE',
    );
    const nextId = (parseInt(result?.maxId as unknown as string, 10) ?? 0) + 1;
    body.IDARBITRE = String(nextId).padStart(4, '0');
  }

  // Valider que les champs requis sont présents
  if (!body.NOM || (typeof body.NOM === 'string' && !body.NOM.trim())) {
    throw new Error('NOM est requis');
  }
  if (!body.IDNATIO || (typeof body.IDNATIO === 'string' && !body.IDNATIO.trim())) {
    throw new Error('IDNATIO (Nationalité) est requis');
  }

  // Utiliser le create de base service
  return baseService.create(body);
}

export default {
  ...baseService,
  create,
  getArbitreSuggestions,
  createArbitreWithWizard,
};
