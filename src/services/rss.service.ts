import { createEntityService, createFieldSanitizer } from '../lib/baseService';
import { AppError } from '../types';

const sanitizeFields = createFieldSanitizer(['RSSID', 'RSSURL', 'RSSDescription'], 'RSSID');

function sanitize(body: Record<string, unknown>, includePk: boolean): Record<string, unknown> {
  const clean = sanitizeFields(body, includePk);

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
    return url.toString();
  } catch {
    throw new AppError(400, 'RSSURL doit être une URL http(s) valide');
  }
}

const baseService = createEntityService({
  table: 'RSS',
  pk: 'RSSID',
  selectCols: ['RSSID', 'RSSURL', 'RSSDescription'],
  allowedSortCols: ['RSSID', 'RSSURL', 'RSSDescription'],
  searchCols: ['RSSID', 'RSSURL', 'RSSDescription'],
});

async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, true);
  if (clean.RSSID !== undefined && clean.RSSID !== null && String(clean.RSSID).trim() === '') {
    delete clean.RSSID;
  }
  if (!clean.RSSURL) {
    throw new AppError(400, 'RSSURL est requis');
  }

  clean.RSSURL = normalizeUrl(clean.RSSURL);

  return baseService.create(clean);
}

async function update(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const clean = sanitize(body, false);
  if (clean.RSSURL !== undefined) {
    clean.RSSURL = normalizeUrl(clean.RSSURL);
  }
  if (clean.RSSDescription !== undefined && typeof clean.RSSDescription === 'string' && !clean.RSSDescription.trim()) {
    clean.RSSDescription = '';
  }
  if (!Object.keys(clean).length) {
    throw new AppError(400, 'No fields provided');
  }
  return baseService.update(id, clean);
}

export default {
  ...baseService,
  create,
  update,
};
