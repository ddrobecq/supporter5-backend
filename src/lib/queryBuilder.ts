import { AppError, QueryParams } from '../types';
import { normalizeSearchText } from './searchUtils';

export interface PageParamsOptions {
  /** Name of the size parameter, used in the 400 message ('limit', 'pageSize'). */
  sizeName: string;
  defaultSize: number;
  maxSize: number;
  /**
   * 'fallback': invalid or missing values fall back to the defaults and the size is clamped to maxSize
   * (generic CRUD lists). 'reject': a given value must be an integer string within bounds, else 400 (grids).
   */
  invalid: 'fallback' | 'reject';
}

function strictPageInteger(value: unknown, name: string, max: number): number {
  const raw = typeof value === 'string' ? value.trim() : '';
  const parsed = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new AppError(400, `Parametre ${name} invalide (entier entre 1 et ${max} attendu)`);
  }
  return parsed;
}

/** Page number and page size of a list query (raw query values, possibly undefined). */
export function parsePageParams(
  rawPage: unknown,
  rawSize: unknown,
  options: PageParamsOptions,
): { page: number; size: number } {
  const { sizeName, defaultSize, maxSize, invalid } = options;
  if (invalid === 'fallback') {
    return {
      page: Math.max(1, Number(rawPage) || 1),
      size: Math.min(maxSize, Math.max(1, Number(rawSize) || defaultSize)),
    };
  }
  return {
    page: rawPage === undefined ? 1 : strictPageInteger(rawPage, 'page', Number.MAX_SAFE_INTEGER),
    size: rawSize === undefined ? defaultSize : strictPageInteger(rawSize, sizeName, maxSize),
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
