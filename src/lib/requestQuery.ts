import type { Request } from 'express';

const DEFAULT_SUGGEST_LIMIT = 12;
const MIN_SUGGEST_LIMIT = 1;
const MAX_SUGGEST_LIMIT = 30;

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.floor(value), min), max);
}

export function parseSuggestQuery(req: Pick<Request, 'query'>): { search: string; limit: number } {
  const search = String(req.query.search ?? '').trim();
  const rawLimit = Number(req.query.limit ?? DEFAULT_SUGGEST_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? clampInteger(rawLimit, MIN_SUGGEST_LIMIT, MAX_SUGGEST_LIMIT)
    : DEFAULT_SUGGEST_LIMIT;

  return { search, limit };
}
