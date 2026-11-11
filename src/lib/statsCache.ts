import type { Request, RequestHandler } from 'express';
import { dataHandler } from './responseHelpers';

/**
 * In-memory cache of derived read data (stats, suggestion candidates), invalidated by "generation":
 * every successful (or 5xx) admin write bumps the generation and drops all entries. No TTL: none of the
 * cached computations depends on the current date (the data only changes through writes).
 * Same spirit as the sitemap cache (sitemap.service), which keeps its own 24 h TTL.
 */
const MAX_ENTRIES = 500;

let generation = 0;
const entries = new Map<string, { generation: number; value: unknown }>();

export function getGeneration(): number {
  return generation;
}

export function bumpGeneration(): void {
  generation += 1;
  entries.clear();
}

/** Number of live entries (diagnostics / tests). */
export function getCacheSize(): number {
  return entries.size;
}

/**
 * Returns the cached value of `key` for the current generation, or computes and stores it.
 * A rejected computation is never stored; a value computed while the generation changed is returned
 * but not stored. Least recently used entries are evicted beyond MAX_ENTRIES.
 * Cached values are shared: callers must not mutate them.
 */
export async function cached<T>(key: string, compute: () => Promise<T> | T): Promise<T> {
  const hit = entries.get(key);
  if (hit && hit.generation === generation) {
    entries.delete(key);
    entries.set(key, hit);
    return hit.value as T;
  }

  const startedAt = generation;
  const value = await compute();
  if (startedAt === generation) {
    entries.delete(key);
    entries.set(key, { generation, value });
    while (entries.size > MAX_ENTRIES) {
      const oldest = entries.keys().next().value as string;
      entries.delete(oldest);
    }
  }
  return value;
}

/** Cache key of a GET request: full path + query parameters sorted by name. */
function requestCacheKey(req: Request): string {
  const query = Object.keys(req.query)
    .sort()
    .map((name) => `${name}=${JSON.stringify(req.query[name])}`)
    .join('&');
  return `${req.baseUrl}${req.path}?${query}`;
}

/** dataHandler whose `data` is cached per path + query for the current generation. */
export function cachedDataHandler(fn: (req: Request) => Promise<unknown>): RequestHandler {
  return dataHandler((req) => cached(requestCacheKey(req), () => fn(req)));
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Bumps the generation after any write request: on success (< 400), on server error (>= 500: a partial
 * write must not leave stale entries) and when the connection closes before the response is complete.
 * Client errors (4xx) leave the cache untouched: the request was rejected before writing.
 */
export const invalidateCacheOnWrite: RequestHandler = (req, res, next) => {
  if (!READ_METHODS.has(req.method)) {
    res.on('close', () => {
      const rejected = res.writableFinished && res.statusCode >= 400 && res.statusCode < 500;
      if (!rejected) bumpGeneration();
    });
  }
  next();
};
