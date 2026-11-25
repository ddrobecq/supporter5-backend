/**
 * Audience statistics (admin). Every query combines the detailed hits (TRAFIC_HIT, last 13 months) and the daily
 * aggregates (TRAFIC_JOUR, older days): both give rows (day, value, bot, pageViews, visits, visitors) per UTC day,
 * never for the same day. Visits and visitors never span two days, so they are summed day by day.
 */
import { dbAll, dbGet } from '../config/database';
import { fetchGridPage, type GridPageResult, type GridPagination } from '../lib/gridPagination';
import { FIXED_PAGE_LABELS, parseTrackedPath, type TrackedEntityType } from '../lib/traficPaths';
import { getClubGridById } from './clubs.service';
import { getJoueurByIdWithVille } from './joueurs.service';
import { getRencontreDetailById } from './rencontres.service';
import { getBufferedHits, hitSourceSql, type TraficDimension } from './trafic.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const REALTIME_WINDOW_MS = 5 * 60 * 1000;
const REALTIME_MAX_PAGES = 50;
/** Pages / referrers / countries are always paginated; this bound only satisfies fetchGridPage's signature. */
const MAX_UNPAGINATED_ROWS = 500;

export interface TraficRange {
  /** First day, "YYYY-MM-DD" (UTC, inclusive). */
  from: string;
  /** Last day, "YYYY-MM-DD" (UTC, inclusive). */
  to: string;
  /** 0: humans only, 1: bots included. */
  maxBot: 0 | 1;
}

export interface TraficTotals { pagesVues: number; visites: number; visiteurs: number; }
export interface TraficResume extends TraficTotals { precedent: TraficTotals; }
export interface TraficPoint extends TraficTotals { t: string; }
export interface TraficPageRow {
  path: string;
  entityType: TrackedEntityType;
  entityId: string | null;
  libelle: string;
  pagesVues: number;
  visiteurs: number;
}
export interface TraficReferentRow { referent: string; visites: number; visiteurs: number; }
export interface TraficPaysRow { pays: string; visites: number; visiteurs: number; }
export interface TraficValueRow { valeur: string; visites: number; }
export interface TraficAppareils { appareils: TraficValueRow[]; navigateurs: TraficValueRow[]; os: TraficValueRow[]; }
export interface TraficTempsReel { visiteurs: number; pages: Array<{ path: string; libelle: string; visiteurs: number }>; }

function dayToMs(day: string): number {
  return Date.parse(`${day}T00:00:00.000Z`);
}

function msToDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function addDays(day: string, days: number): string {
  return msToDay(dayToMs(day) + days * DAY_MS);
}

/** Number of days of the range, bounds included. */
export function rangeDays(range: Pick<TraficRange, 'from' | 'to'>): number {
  return Math.round((dayToMs(range.to) - dayToMs(range.from)) / DAY_MS) + 1;
}

/** Union of detailed hits and daily aggregates for `dimension` over the range. */
function sourceSql(dimension: TraficDimension, range: TraficRange): { sql: string; params: unknown[] } {
  const hits = hitSourceSql(dimension, range.from, addDays(range.to, 1), range.maxBot);
  return {
    sql: `${hits.sql}
          UNION ALL
          SELECT "TJ_DAY" AS day, "TJ_VALUE" AS value, "TJ_BOT" AS bot,
                 "TJ_PAGE_VIEWS" AS pageViews, "TJ_VISITS" AS visits, "TJ_VISITORS" AS visitors
          FROM "TRAFIC_JOUR"
          WHERE "TJ_DIMENSION" = ? AND "TJ_DAY" BETWEEN ? AND ? AND "TJ_BOT" <= ?`,
    params: [...hits.params, dimension, range.from, range.to, range.maxBot],
  };
}

async function getTotals(range: TraficRange): Promise<TraficTotals> {
  const source = sourceSql('total', range);
  const row = await dbGet<TraficTotals>(
    `SELECT COALESCE(SUM(pageViews), 0) AS pagesVues, COALESCE(SUM(visits), 0) AS visites,
            COALESCE(SUM(visitors), 0) AS visiteurs
     FROM (${source.sql})`,
    source.params,
  );
  return { pagesVues: row?.pagesVues ?? 0, visites: row?.visites ?? 0, visiteurs: row?.visiteurs ?? 0 };
}

export async function getTraficResume(range: TraficRange): Promise<TraficResume> {
  const days = rangeDays(range);
  const previous: TraficRange = { from: addDays(range.from, -days), to: addDays(range.from, -1), maxBot: range.maxBot };
  return { ...(await getTotals(range)), precedent: await getTotals(previous) };
}

export async function getTraficSerie(range: TraficRange, grain: 'jour' | 'heure'): Promise<TraficPoint[]> {
  const hourly = grain === 'heure';
  const source = sourceSql(hourly ? 'hour' : 'total', range);
  const rows = await dbAll<TraficTotals & { day: string; value: string }>(
    `SELECT day, value, SUM(pageViews) AS pagesVues, SUM(visits) AS visites, SUM(visitors) AS visiteurs
     FROM (${source.sql})
     GROUP BY day, value`,
    source.params,
  );
  const byKey = new Map(rows.map((row) => [hourly ? `${row.day}T${row.value}` : row.day, row]));

  const points: TraficPoint[] = [];
  const days = rangeDays(range);
  for (let index = 0; index < days; index += 1) {
    const day = addDays(range.from, index);
    for (const hour of hourly ? Array.from({ length: 24 }, (_v, h) => String(h).padStart(2, '0')) : ['00']) {
      const row = byKey.get(hourly ? `${day}T${hour}` : day);
      points.push({
        t: `${day}T${hour}:00:00.000Z`,
        pagesVues: row?.pagesVues ?? 0,
        visites: row?.visites ?? 0,
        visiteurs: row?.visiteurs ?? 0,
      });
    }
  }
  return points;
}

// ---------------------------------------------------------------------------
// Business labels of the pages
// ---------------------------------------------------------------------------

function textField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** Same rule as the players lists: nickname, otherwise "NOM Prenom". */
function playerDisplayName(row: Record<string, unknown>): string {
  return textField(row, 'SURNOM') || `${textField(row, 'NOM').toUpperCase()} ${textField(row, 'PRENOM')}`.trim();
}

async function resolveEntityLabel(entityType: TrackedEntityType, entityId: string): Promise<string> {
  if (entityType === 'club') {
    const club = await getClubGridById(entityId);
    return club ? (club.CLUB_NOM_COMPLET || club.CLUB_ABREGE || 'Club sans nom') : 'Club introuvable';
  }
  if (entityType === 'joueur') {
    const joueur = await getJoueurByIdWithVille(entityId);
    return joueur ? (playerDisplayName(joueur) || 'Joueur sans nom') : 'Joueur introuvable';
  }
  const rencontre = await getRencontreDetailById(entityId);
  if (!rencontre) return 'Rencontre introuvable';
  // Programmed match: participants not resolved yet.
  const home = rencontre.DOMICILE_NOM_COMPLET.trim() || rencontre.DOMICILE_ABREGE.trim() || 'À déterminer';
  const away = rencontre.EXTERIEUR_NOM_COMPLET.trim() || rencontre.EXTERIEUR_ABREGE.trim() || 'À déterminer';
  return [(rencontre.DATE ?? '').trim(), home, away].filter(Boolean).join(' – ');
}

/** Label of a tracked path; `cache` avoids resolving the same page twice in one response. */
async function resolvePageLabel(path: string, cache: Map<string, string>): Promise<string> {
  const cached = cache.get(path);
  if (cached !== undefined) return cached;
  const tracked = parseTrackedPath(path);
  let label: string;
  if (!tracked) label = path;
  else if (tracked.entityId === null) label = FIXED_PAGE_LABELS[path];
  else label = await resolveEntityLabel(tracked.entityType, tracked.entityId);
  cache.set(path, label);
  return label;
}

export async function getTraficPages(range: TraficRange, pagination: GridPagination): Promise<GridPageResult<TraficPageRow>> {
  const source = sourceSql('page', range);
  const result = await fetchGridPage<{ path: string; pagesVues: number; visiteurs: number }>(
    `SELECT value AS path, SUM(pageViews) AS pagesVues, SUM(visitors) AS visiteurs
     FROM (${source.sql})
     GROUP BY value
     ORDER BY pagesVues DESC, path ASC`,
    source.params,
    pagination,
    MAX_UNPAGINATED_ROWS,
  );
  const labels = new Map<string, string>();
  const data: TraficPageRow[] = [];
  for (const row of result.data) {
    const tracked = parseTrackedPath(row.path);
    data.push({
      path: row.path,
      entityType: tracked?.entityType ?? '',
      entityId: tracked?.entityId ?? null,
      libelle: await resolvePageLabel(row.path, labels),
      pagesVues: row.pagesVues,
      visiteurs: row.visiteurs,
    });
  }
  return { ...result, data };
}

/** Visits / visitors per value of a visit dimension, most visited first. */
function visitDimensionSql(dimension: TraficDimension, range: TraficRange, alias: string): { sql: string; params: unknown[] } {
  const source = sourceSql(dimension, range);
  return {
    sql: `SELECT value AS ${alias}, SUM(visits) AS visites, SUM(visitors) AS visiteurs
          FROM (${source.sql})
          GROUP BY value
          ORDER BY visites DESC, ${alias} ASC`,
    params: source.params,
  };
}

export async function getTraficReferents(range: TraficRange, pagination: GridPagination): Promise<GridPageResult<TraficReferentRow>> {
  const query = visitDimensionSql('referrer', range, 'referent');
  return fetchGridPage<TraficReferentRow>(query.sql, query.params, pagination, MAX_UNPAGINATED_ROWS);
}

export async function getTraficPays(range: TraficRange, pagination: GridPagination): Promise<GridPageResult<TraficPaysRow>> {
  const query = visitDimensionSql('country', range, 'pays');
  return fetchGridPage<TraficPaysRow>(query.sql, query.params, pagination, MAX_UNPAGINATED_ROWS);
}

export async function getTraficAppareils(range: TraficRange): Promise<TraficAppareils> {
  const values = async (dimension: TraficDimension): Promise<TraficValueRow[]> => {
    const query = visitDimensionSql(dimension, range, 'valeur');
    const rows = await dbAll<TraficValueRow & { visiteurs: number }>(query.sql, query.params);
    return rows.map(({ valeur, visites }) => ({ valeur, visites }));
  };
  return { appareils: await values('device'), navigateurs: await values('browser'), os: await values('os') };
}

/** Human visitors of the last 5 minutes, written hits and hits still in the buffer. */
export async function getTraficTempsReel(now = Date.now()): Promise<TraficTempsReel> {
  const since = new Date(now - REALTIME_WINDOW_MS).toISOString();
  const rows = await dbAll<{ path: string; visitor: string }>(
    `SELECT "TH_PATH" AS path, "TH_VISITOR" AS visitor FROM "TRAFIC_HIT" WHERE "TH_DATE" >= ? AND "TH_BOT" = 0`,
    [since],
  );
  for (const hit of getBufferedHits()) {
    if (hit.bot === 0 && hit.date >= since) rows.push({ path: hit.path, visitor: hit.visitor });
  }

  const visitors = new Set<string>();
  const pages = new Map<string, Set<string>>();
  for (const row of rows) {
    visitors.add(row.visitor);
    const pageVisitors = pages.get(row.path) ?? new Set<string>();
    pageVisitors.add(row.visitor);
    pages.set(row.path, pageVisitors);
  }

  const top = [...pages.entries()]
    .map(([path, set]) => ({ path, visiteurs: set.size }))
    .sort((a, b) => b.visiteurs - a.visiteurs || a.path.localeCompare(b.path))
    .slice(0, REALTIME_MAX_PAGES);
  const labels = new Map<string, string>();
  const result: TraficTempsReel['pages'] = [];
  for (const page of top) {
    result.push({ path: page.path, libelle: await resolvePageLabel(page.path, labels), visiteurs: page.visiteurs });
  }
  return { visiteurs: visitors.size, pages: result };
}
