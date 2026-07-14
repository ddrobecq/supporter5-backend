import { QueryParams } from '../types';

function normalizeSearchInput(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
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
): { where: string; bindings: unknown[] } {
  const conditions: string[] = [];
  const bindings: unknown[] = [];

  // Recherche plein-texte (LIKE)
  if (params.search && typeof params.search === 'string' && searchCols.length > 0) {
    const normalizedSearch = normalizeSearchInput(params.search);
    if (normalizedSearch) {
      const clause = searchCols.map((col) => `lower(ifnull("${col}", '')) LIKE ?`).join(' OR ');
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
      conditions.push(`"${col}" = ?`);
      bindings.push(val);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, bindings };
}
