import { createEntityService } from '../lib/baseService';
import { AppError } from '../types';

function sanitize(body: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...body };

  if (clean.RSSID !== undefined && clean.RSSID !== null) {
    const rawId = String(clean.RSSID).trim();
    if (rawId === '') {
      delete clean.RSSID;
    } else if (Number.isFinite(Number(rawId))) {
      clean.RSSID = Number(rawId);
    }
  }

  if (typeof clean.RSSURL === 'string') {
    clean.RSSURL = clean.RSSURL.trim();
  }

  if (typeof clean.RSSDescription === 'string') {
    clean.RSSDescription = clean.RSSDescription.trim();
  }

  return clean;
}

function normalizeUrl(value: unknown): string {
  const next = typeof value === 'string' ? value.trim() : '';
  if (!next) {
    throw new AppError(400, 'RSSURL est requis');
  }

  try {
    const url = new URL(next);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Unsupported protocol');
    }
    // Validation only: the trimmed string is stored as sent (no URL.toString() normalization).
    return next;
  } catch {
    throw new AppError(400, 'RSSURL doit être une URL http(s) valide');
  }
}

function prepareWrite(body: Record<string, unknown>, mode: 'create' | 'update'): Record<string, unknown> {
  const clean = sanitize(body);
  if (mode === 'create') {
    if (!clean.RSSURL) {
      throw new AppError(400, 'RSSURL est requis');
    }
    clean.RSSURL = normalizeUrl(clean.RSSURL);
    return clean;
  }

  if (clean.RSSURL !== undefined) {
    clean.RSSURL = normalizeUrl(clean.RSSURL);
  }
  return clean;
}

export default createEntityService({
  table: 'RSS',
  pk: 'RSSID',
  selectCols: ['RSSID', 'RSSURL', 'RSSDescription'],
  allowedSortCols: ['RSSID', 'RSSURL', 'RSSDescription'],
  searchCols: ['RSSID', 'RSSURL', 'RSSDescription'],
  prepareWrite,
});
