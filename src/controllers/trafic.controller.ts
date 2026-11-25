import type { Request } from 'express';
import { trackingClientIp } from '../lib/clientIp';
import { parsePageParams } from '../lib/queryBuilder';
import { normalizeDayDate } from '../lib/dates';
import { asyncHandler, jsonHandler } from '../lib/responseHelpers';
import { parseHitPayload, recordHit } from '../services/trafic.service';
import {
  getTraficAppareils,
  getTraficPages,
  getTraficPays,
  getTraficReferents,
  getTraficResume,
  getTraficSerie,
  getTraficTempsReel,
  rangeDays,
  type TraficRange,
} from '../services/traficStats.service';
import { AppError } from '../types';

const MAX_HOURLY_DAYS = 7;
/** Bounds the size of the daily series (about 10 years). */
const MAX_DAILY_DAYS = 3660;

/** `from` / `to` (YYYY-MM-DD, UTC, inclusive, required) and `bots` (0 default | 1). */
function parseRange(query: Request['query']): TraficRange {
  const from = normalizeDayDate(query.from, { required: true, field: 'de début (from)' });
  const to = normalizeDayDate(query.to, { required: true, field: 'de fin (to)' });
  if (from > to) throw new AppError(400, 'La date de début (from) doit précéder la date de fin (to).');
  const bots = query.bots ?? '0';
  if (bots !== '0' && bots !== '1') throw new AppError(400, 'Paramètre bots invalide (0 ou 1 attendu).');
  return { from, to, maxBot: bots === '1' ? 1 : 0 };
}

export const postHit = asyncHandler(async (req, res) => {
  recordHit(parseHitPayload(req.body), trackingClientIp(req), req.get('user-agent') ?? '');
  res.status(204).send();
});

export const getResume = jsonHandler((req) => getTraficResume(parseRange(req.query)));

export const getSerie = jsonHandler((req) => {
  const range = parseRange(req.query);
  const grain = req.query.grain ?? 'jour';
  if (grain !== 'jour' && grain !== 'heure') throw new AppError(400, 'Paramètre grain invalide (jour ou heure attendu).');
  const maxDays = grain === 'heure' ? MAX_HOURLY_DAYS : MAX_DAILY_DAYS;
  if (rangeDays(range) > maxDays) throw new AppError(400, `Période trop longue pour grain=${grain} (${maxDays} jours maximum).`);
  return getTraficSerie(range, grain);
});

export const getPages = jsonHandler((req) => getTraficPages(parseRange(req.query), parsePageParams(req.query)));

export const getReferents = jsonHandler((req) => getTraficReferents(parseRange(req.query), parsePageParams(req.query)));

export const getPays = jsonHandler((req) => getTraficPays(parseRange(req.query), parsePageParams(req.query)));

export const getAppareils = jsonHandler((req) => getTraficAppareils(parseRange(req.query)));

export const getTempsReel = jsonHandler(() => getTraficTempsReel());
