import { AppError, QueryParams } from '../types';
import { normalizeSearchText } from './searchUtils';

/** Single pagination convention of every list route: `page` (>= 1, default 1) and `pageSize` (1..500, default 100). */
export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 500;

function strictPageInteger(value: unknown, name: string, max: number): number {
  const raw = typeof value === 'string' ? value.trim() : '';
  const parsed = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new AppError(400, max === Number.MAX_SAFE_INTEGER
      ? `Parametre ${name} invalide (entier >= 1 attendu)`
      : `Parametre ${name} invalide (entier entre 1 et ${max} attendu)`);
  }
  return parsed;
}

/**
 * `page` / `pageSize` query values (possibly undefined): absent -> default, otherwise an integer within bounds,
 * else 400 (never clamped nor replaced). The former `limit` parameter is rejected so that it is never silently ignored.
 */
export function parsePageParams(query: { page?: unknown; pageSize?: unknown; limit?: unknown }): { page: number; pageSize: number } {
  if (query.limit !== undefined) {
    throw new AppError(400, 'Parametre limit non supporte : utilisez pageSize.');
  }
  return {
    page: query.page === undefined ? 1 : strictPageInteger(query.page, 'page', Number.MAX_SAFE_INTEGER),
    pageSize: query.pageSize === undefined ? DEFAULT_PAGE_SIZE : strictPageInteger(query.pageSize, 'pageSize', MAX_PAGE_SIZE),
  };
}

/**
 * Vérifie que la colonne demandée est dans la liste blanche.
 * Évite toute injection SQL via le paramètre `sort`.
 */
export function sanitizeSort(
  sort: string | undefined,
  allowed: readonly string[],
  defaultCol: string,
): string {
  if (sort && allowed.map((c) => c.toUpperCase()).includes(sort.toUpperCase())) {
    return sort.toUpperCase();
  }
  return defaultCol;
}

/**
 * Construit la clause WHERE + les bindings positionnels.
 * @param searchCols  colonnes pour la recherche LIKE (paramètre `search`)
 * @param filterCols  colonnes pour le filtre exact (nom exact de la colonne SQL ;
 *                    le paramètre URL attendu est le nom en minuscules)
 */
export function buildWhere(
  params: QueryParams,
  searchCols: readonly string[],
  filterCols: readonly string[],
  /** Main table alias (EntityConfig.tableAlias): columns are qualified to stay unambiguous with joins. */
  tableAlias?: string,
): { where: string; bindings: unknown[] } {
  const colPrefix = tableAlias ? `${tableAlias}.` : '';
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  // Recherche plein-texte (LIKE)
  if (params.search && typeof params.search === 'string' && searchCols.length > 0) {
    const normalizedSearch = normalizeSearchText(params.search);
    if (normalizedSearch) {
      const clause = searchCols.map((col) => `fold(${colPrefix}"${col}") LIKE ?`).join(' OR ');
      conditions.push(`(${clause})`);
      const val = `%${normalizedSearch}%`;
      searchCols.forEach(() => bindings.push(val));
    }
  }

  // Filtres exacts
  for (const col of filterCols) {
    const key = col.toLowerCase();
    const val = params[key];
    if (val !== undefined && val !== '') {
      conditions.push(`${colPrefix}"${col}" = ?`);
      bindings.push(val);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, bindings };
}
