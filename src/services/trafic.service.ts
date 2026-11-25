/**
 * Cookie-free audience tracking (CNIL exemption): no IP is ever stored nor logged.
 * - Visitor = sha256(visitorId) when the front sends its persistent random UUID (the raw id is never stored
 *   nor logged), otherwise sha256(ip + user-agent + daily random salt kept in memory only), which cannot be
 *   reversed nor linked from one UTC day to the next.
 * - Visit = same visitor with less than 30 min of inactivity (in-memory map, lost on restart).
 * - Hits are buffered and written in one transaction every few seconds.
 * - Hits older than 13 months are aggregated into TRAFIC_JOUR, then purged.
 */
import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import maxmind, { type CountryResponse, type Reader } from 'maxmind';
import db, { resolvedDbPath } from '../config/database';
import { parseTrackedPath, type TrackedEntityType } from '../lib/traficPaths';
import { parseUserAgent, type DeviceType } from '../lib/userAgent';
import { AppError } from '../types';

const MAX_REFERRER_LENGTH = 500;
const VISITOR_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const VISIT_INACTIVITY_MS = 30 * 60 * 1000;
const FLUSH_INTERVAL_MS = 5_000;
const VISIT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const MAINTENANCE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const RETENTION_MONTHS = 13;
/** Bounds memory if the database stays unavailable: extra hits are dropped (and counted in the log). */
const MAX_BUFFERED_HITS = 10_000;
const GEOIP_MAX_AGE_MS = 35 * 24 * 60 * 60 * 1000;
const GEOIP_UPDATE_TIMEOUT_MS = 5 * 60 * 1000;
const GEOIP_UPDATE_SCRIPT = path.resolve(__dirname, '../../scripts/update-geoip.js');

/** GEOIP_DB_PATH (relative paths resolved from the working directory), by default next to the SQLite database. */
const geoipDbPath = (() => {
  const configured = (process.env.GEOIP_DB_PATH ?? '').trim();
  return configured
    ? path.resolve(process.cwd(), configured)
    : path.join(path.dirname(resolvedDbPath), 'dbip-country-lite.mmdb');
})();

/** Hosts of the site itself (CORS_ORIGINS, same default as app.ts): such referrers count as direct access. */
const ownHosts = new Set(
  (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => {
      try {
        return new URL(origin.trim()).hostname.toLowerCase();
      } catch {
        // A malformed CORS origin simply contributes no host.
        return '';
      }
    })
    .filter(Boolean),
);

export interface BufferedHit {
  date: string;
  path: string;
  entityType: TrackedEntityType;
  entityId: string | null;
  referrer: string;
  country: string;
  device: DeviceType;
  browser: string;
  os: string;
  visitor: string;
  visit: string;
  bot: 0 | 1;
}

export interface HitPayload {
  path: string;
  referrer: string;
  /** Persistent random UUID of the browser (lowercase), null when not sent. */
  visitorId: string | null;
}

let enabled = false;
let buffer: BufferedHit[] = [];
let droppedHits = 0;
let geoReader: Reader<CountryResponse> | null = null;
let salt = { day: '', value: Buffer.alloc(0) };
const visits = new Map<string, { visit: string; lastSeen: number }>();

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Body sent by navigator.sendBeacon: text/plain containing `{ "path": string, "referrer"?: string, "visitorId"?: uuid }`. */
export function parseHitPayload(body: unknown): HitPayload {
  if (typeof body !== 'string' || body === '') throw new AppError(400, 'Corps text/plain JSON attendu.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new AppError(400, 'Corps de requête JSON invalide.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new AppError(400, 'Objet JSON attendu.');
  const { path: rawPath, referrer: rawReferrer, visitorId: rawVisitorId } = parsed as Record<string, unknown>;
  if (typeof rawPath !== 'string' || !parseTrackedPath(rawPath)) throw new AppError(400, 'Chemin invalide.');
  if (rawReferrer !== undefined && typeof rawReferrer !== 'string') throw new AppError(400, 'Référent invalide.');
  const referrer = rawReferrer ?? '';
  if (referrer.length > MAX_REFERRER_LENGTH) throw new AppError(400, 'Référent invalide.');
  if (rawVisitorId !== undefined && (typeof rawVisitorId !== 'string' || !VISITOR_ID_PATTERN.test(rawVisitorId))) {
    throw new AppError(400, 'Identifiant visiteur invalide.');
  }
  return { path: rawPath, referrer, visitorId: rawVisitorId ?? null };
}

/** External referrer host ('' for direct access or the site itself); AppError 400 for a non-URL value. */
function referrerHost(referrer: string): string {
  if (referrer === '') return '';
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    throw new AppError(400, 'Référent invalide.');
  }
  return ownHosts.has(host) ? '' : host;
}

// ---------------------------------------------------------------------------
// Ingestion
// ---------------------------------------------------------------------------

function dailySalt(day: string): Buffer {
  if (salt.day !== day) salt = { day, value: crypto.randomBytes(32) };
  return salt.value;
}

/** ISO country code of `ip`, '' when unknown or when the GeoIP database is not loaded. */
function lookupCountry(ip: string): string {
  if (!geoReader || ip === '') return '';
  const address = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (!maxmind.validate(address)) return '';
  const code = geoReader.get(address)?.country?.iso_code ?? '';
  return /^[A-Z]{2}$/.test(code) ? code : '';
}

function visitFor(visitor: string, now: number): string {
  const current = visits.get(visitor);
  if (current && now - current.lastSeen < VISIT_INACTIVITY_MS) {
    current.lastSeen = now;
    return current.visit;
  }
  const visit = crypto.randomBytes(12).toString('hex');
  visits.set(visitor, { visit, lastSeen: now });
  return visit;
}

/** Buffers one page view. `ip` is only used for the hash and the country lookup, never kept. */
export function recordHit(payload: HitPayload, ip: string, userAgent: string): void {
  const tracked = parseTrackedPath(payload.path);
  if (!tracked) throw new AppError(400, 'Chemin invalide.');
  const referrer = referrerHost(payload.referrer);
  if (!enabled) return;
  if (buffer.length >= MAX_BUFFERED_HITS) {
    droppedHits += 1;
    return;
  }

  const nowDate = new Date();
  const date = nowDate.toISOString();
  const ua = parseUserAgent(userAgent);
  const hash = crypto.createHash('sha256');
  if (payload.visitorId !== null) hash.update(payload.visitorId);
  else hash.update(ip).update('\n').update(userAgent).update('\n').update(dailySalt(date.slice(0, 10)));
  const visitor = hash.digest('hex').slice(0, 32);

  buffer.push({
    date,
    path: tracked.path,
    entityType: tracked.entityType,
    entityId: tracked.entityId,
    referrer,
    country: lookupCountry(ip),
    device: ua.device,
    browser: ua.browser,
    os: ua.os,
    visitor,
    visit: visitFor(visitor, nowDate.getTime()),
    bot: ua.bot ? 1 : 0,
  });
}

/** Hits received but not written yet (read by the real-time statistics). */
export function getBufferedHits(): readonly BufferedHit[] {
  return buffer;
}

/** Writes the buffered hits in one transaction; on failure the batch is dropped and logged (never retried). */
export function flushHits(): void {
  if (droppedHits > 0) {
    console.warn(`[trafic] ${droppedHits} hit(s) ignore(s): tampon plein.`);
    droppedHits = 0;
  }
  if (buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  try {
    const insert = db.prepare(
      `INSERT INTO "TRAFIC_HIT" ("TH_DATE", "TH_PATH", "TH_ENTITY_TYPE", "TH_ENTITY_ID", "TH_REFERRER", "TH_COUNTRY",
         "TH_DEVICE", "TH_BROWSER", "TH_OS", "TH_VISITOR", "TH_VISIT", "TH_BOT")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    db.transaction((rows: BufferedHit[]) => {
      for (const hit of rows) {
        insert.run(hit.date, hit.path, hit.entityType, hit.entityId, hit.referrer, hit.country,
          hit.device, hit.browser, hit.os, hit.visitor, hit.visit, hit.bot);
      }
    })(batch);
  } catch (error) {
    console.error(`[trafic] ecriture de ${batch.length} hit(s) abandonnee:`, error);
  }
}

function cleanupVisits(): void {
  const now = Date.now();
  for (const [visitor, entry] of visits) {
    if (now - entry.lastSeen >= VISIT_INACTIVITY_MS) visits.delete(visitor);
  }
}

// ---------------------------------------------------------------------------
// Maintenance: daily aggregates + purge
// ---------------------------------------------------------------------------

/** Dimensions computed on every hit of the day. */
export const HIT_DIMENSIONS = {
  total: `''`,
  hour: `substr(h."TH_DATE", 12, 2)`,
  page: `h."TH_PATH"`,
} as const;

/** Dimensions of a visit, taken from its first hit (landing page referrer, country, device...). */
export const VISIT_DIMENSIONS = {
  referrer: '"TH_REFERRER"',
  country: '"TH_COUNTRY"',
  device: '"TH_DEVICE"',
  browser: '"TH_BROWSER"',
  os: '"TH_OS"',
} as const;

export type TraficDimension = keyof typeof HIT_DIMENSIONS | keyof typeof VISIT_DIMENSIONS;

/**
 * Grouping of the detailed hits:
 * - 'dayBot': one row per (UTC day, value, bot), the TRAFIC_JOUR granularity (maintenance);
 * - 'day': one row per (UTC day, value), visitors distinct per day (or per hour for the 'hour' dimension);
 * - 'period': one row per value over the whole range, visitors distinct over the range (a persistent visitor
 *   seen on several days counts once). Visits stay counted per day (COUNT DISTINCT of day + visit) so that they
 *   remain consistent with the daily sums of TRAFIC_JOUR.
 */
export type HitGrouping = 'dayBot' | 'day' | 'period';

/**
 * Detailed hits in [start, end) (ISO prefixes compared as text) with `TH_BOT <= maxBot`, as rows
 * (day, value, [bot,] pageViews, visits, visitors) grouped as described above ('' as day for 'period';
 * bot only for 'dayBot'). The SQL fragments come from the constant maps above.
 */
export function hitSourceSql(
  dimension: TraficDimension,
  start: string,
  end: string,
  maxBot: number,
  grouping: HitGrouping = 'dayBot',
): { sql: string; params: unknown[] } {
  const range = `"TH_DATE" >= ? AND "TH_DATE" < ? AND "TH_BOT" <= ?`;
  const perPeriod = grouping === 'period';
  const columns = `${perPeriod ? `''` : `substr(h."TH_DATE", 1, 10)`} AS day, %VALUE% AS value,
              ${grouping === 'dayBot' ? `h."TH_BOT" AS bot,` : ''}
              COUNT(*) AS pageViews,
              ${perPeriod ? `COUNT(DISTINCT substr(h."TH_DATE", 1, 10) || h."TH_VISIT")` : `COUNT(DISTINCT h."TH_VISIT")`} AS visits,
              COUNT(DISTINCT h."TH_VISITOR") AS visitors`;
  const groupBy = { dayBot: 'day, value, bot', day: 'day, value', period: 'value' }[grouping];
  if (dimension in HIT_DIMENSIONS) {
    const value = HIT_DIMENSIONS[dimension as keyof typeof HIT_DIMENSIONS];
    return {
      sql: `SELECT ${columns.replace('%VALUE%', value)}
            FROM "TRAFIC_HIT" h
            WHERE ${range.replaceAll('"TH_', 'h."TH_')}
            GROUP BY ${groupBy}`,
      params: [start, end, maxBot],
    };
  }
  const column = VISIT_DIMENSIONS[dimension as keyof typeof VISIT_DIMENSIONS];
  return {
    sql: `SELECT ${columns.replace('%VALUE%', 'e.value')}
          FROM "TRAFIC_HIT" h
          INNER JOIN (
            SELECT "TH_VISIT", ${column} AS value
            FROM "TRAFIC_HIT"
            WHERE "TH_ID" IN (SELECT MIN("TH_ID") FROM "TRAFIC_HIT" WHERE ${range} GROUP BY "TH_VISIT")
          ) e ON e."TH_VISIT" = h."TH_VISIT"
          WHERE ${range.replaceAll('"TH_', 'h."TH_')}
          GROUP BY ${groupBy}`,
    params: [start, end, maxBot, start, end, maxBot],
  };
}

const ALL_DIMENSIONS = [...Object.keys(HIT_DIMENSIONS), ...Object.keys(VISIT_DIMENSIONS)] as TraficDimension[];

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Aggregates then purges, in one transaction, the hits of the days older than the retention period. */
export function runTraficMaintenance(now = new Date()): number {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - RETENTION_MONTHS, now.getUTCDate()));
  const cutoffDay = utcDay(cutoff);
  return db.transaction(() => {
    for (const dimension of ALL_DIMENSIONS) {
      const source = hitSourceSql(dimension, '', cutoffDay, 1);
      db.prepare(
        `INSERT INTO "TRAFIC_JOUR" ("TJ_DAY", "TJ_DIMENSION", "TJ_VALUE", "TJ_BOT", "TJ_PAGE_VIEWS", "TJ_VISITS", "TJ_VISITORS")
         SELECT day, ?, value, bot, pageViews, visits, visitors FROM (${source.sql}) WHERE true
         ON CONFLICT ("TJ_DAY", "TJ_DIMENSION", "TJ_VALUE", "TJ_BOT") DO UPDATE SET
           "TJ_PAGE_VIEWS" = "TJ_PAGE_VIEWS" + excluded."TJ_PAGE_VIEWS",
           "TJ_VISITS" = "TJ_VISITS" + excluded."TJ_VISITS",
           "TJ_VISITORS" = "TJ_VISITORS" + excluded."TJ_VISITORS"`,
      ).run(dimension, ...(source.params as Array<string | number>));
    }
    return db.prepare('DELETE FROM "TRAFIC_HIT" WHERE "TH_DATE" < ?').run(cutoffDay).changes;
  })();
}

function maintenance(): void {
  try {
    const purged = runTraficMaintenance();
    if (purged > 0) console.info(`[trafic] ${purged} hit(s) agrege(s) puis purge(s).`);
  } catch (error) {
    console.error('[trafic] maintenance ignoree:', error);
  }
}

// ---------------------------------------------------------------------------
// GeoIP
// ---------------------------------------------------------------------------

async function loadGeoip(): Promise<boolean> {
  if (!fs.existsSync(geoipDbPath)) return false;
  geoReader = await maxmind.open<CountryResponse>(geoipDbPath);
  return true;
}

function updateGeoipInBackground(): void {
  execFile(
    process.execPath,
    [GEOIP_UPDATE_SCRIPT],
    { env: { ...process.env, GEOIP_DB_PATH: geoipDbPath }, timeout: GEOIP_UPDATE_TIMEOUT_MS },
    (error, _stdout, stderr) => {
      if (error) {
        console.error(`[trafic] mise a jour GeoIP echouee: ${stderr.trim() || error.message}`);
        return;
      }
      loadGeoip()
        .then(() => console.info(`[trafic] base GeoIP mise a jour: ${geoipDbPath}`))
        .catch((loadError: unknown) => console.error('[trafic] rechargement GeoIP echoue:', loadError));
    },
  );
}

async function initGeoip(): Promise<void> {
  try {
    if (!(await loadGeoip())) {
      console.warn(`[trafic] base GeoIP absente (${geoipDbPath}): pays inconnu, telechargement lance.`);
      updateGeoipInBackground();
      return;
    }
  } catch (error) {
    console.warn(`[trafic] base GeoIP illisible (${geoipDbPath}): pays inconnu.`, error);
    updateGeoipInBackground();
    return;
  }
  if (Date.now() - fs.statSync(geoipDbPath).mtimeMs > GEOIP_MAX_AGE_MS) updateGeoipInBackground();
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/** Starts tracking (timers, GeoIP, maintenance). Disabled with one warning when the tables are missing. */
export function startTrafic(): void {
  const table = db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'TRAFIC_HIT'`).get();
  if (!table) {
    console.warn('[trafic] table TRAFIC_HIT absente (npm run db:migrate-trafic): suivi d audience desactive.');
    return;
  }
  enabled = true;
  initGeoip().catch((error: unknown) => console.error('[trafic] initialisation GeoIP echouee:', error));
  maintenance();
  setInterval(flushHits, FLUSH_INTERVAL_MS).unref();
  setInterval(cleanupVisits, VISIT_CLEANUP_INTERVAL_MS).unref();
  setInterval(maintenance, MAINTENANCE_INTERVAL_MS).unref();
}
