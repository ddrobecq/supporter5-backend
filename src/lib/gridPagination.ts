import type { Request } from 'express';
import { dbAll, dbGet } from '../config/database';
import { parsePageParams } from './queryBuilder';

export interface GridPagination {
  page: number;
  pageSize: number;
}

/** Additive metadata returned next to `data`, so `{ data }` consumers keep working. */
export interface GridPageMeta {
  /** Number of rows matching the filters (before pagination or truncation). */
  total: number;
  /** True when an unpaginated response was cut at the hard row limit. */
  truncated: boolean;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export type GridPageResult<T> = { data: T[] } & GridPageMeta;

/**
 * Optional `page` / `pageSize` query parameters. Returns undefined when neither is given,
 * which keeps the historical "all rows" behavior (bounded by a hard row limit).
 */
export function parseGridPagination(query: Request['query']): GridPagination | undefined {
  if (query.page === undefined && query.pageSize === undefined && query.limit === undefined) {
    return undefined;
  }
  return parsePageParams(query);
}

async function countRows(baseSql: string, params: unknown[]): Promise<number> {
  const row = await dbGet<{ total: number }>(`SELECT COUNT(*) AS total FROM (${baseSql})`, params);
  return Number(row?.total ?? 0);
}

/**
 * Runs `baseSql` (a SELECT ending with its ORDER BY clause) either for one page, or for all rows
 * capped at `maxUnpaginatedRows`. LIMIT / OFFSET values are always bound parameters.
 */
export async function fetchGridPage<T>(
  baseSql: string,
  params: unknown[],
  pagination: GridPagination | undefined,
  maxUnpaginatedRows: number,
): Promise<GridPageResult<T>> {
  if (pagination) {
    const { page, pageSize } = pagination;
    const total = await countRows(baseSql, params);
    const data = await dbAll<T>(`${baseSql} LIMIT ? OFFSET ?`, [...params, pageSize, (page - 1) * pageSize]);
    return { data, total, truncated: false, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  const rows = await dbAll<T>(`${baseSql} LIMIT ?`, [...params, maxUnpaginatedRows + 1]);
  if (rows.length <= maxUnpaginatedRows) {
    return { data: rows, total: rows.length, truncated: false };
  }
  return { data: rows.slice(0, maxUnpaginatedRows), total: await countRows(baseSql, params), truncated: true };
}
