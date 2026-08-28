import { dbAll } from '../config/database';
import { getSupportedClubIdFromEnv } from '../lib/supportedClub';

type SitemapRow = {
  kind: 'club' | 'joueur';
  id: string;
};

type RencontreRow = {
  id: number;
};

type SitemapCache = {
  xml: string;
  expiresAt: number;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SITE_URL = 'https://votre-domaine.com';

let cache: SitemapCache | null = null;
let refreshInProgress: Promise<string> | null = null;

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function normalizeSiteUrl(): string {
  return (process.env.PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).trim().replace(/\/$/, '');
}

function buildUrl(siteUrl: string, path: string): string {
  return `${siteUrl}${path}`;
}

function buildSitemapXml(rows: SitemapRow[], rencontres: RencontreRow[]): string {
  const siteUrl = normalizeSiteUrl();
  const urls = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/calendrier', changefreq: 'daily', priority: '0.8' },
    { path: '/statistiques', changefreq: 'weekly', priority: '0.7' },
    ...rows.map((row) => ({
      path: `/${row.kind === 'club' ? 'clubs' : 'joueurs'}/${encodeURIComponent(row.id)}`,
      changefreq: 'weekly',
      priority: '0.5',
    })),
    ...rencontres.map((row) => ({
      path: `/rencontres/${encodeURIComponent(String(row.id))}`,
      changefreq: 'daily',
      priority: '0.6',
    })),
  ];

  const entries = urls.map(({ path, changefreq, priority }) => `  <url>\n    <loc>${xmlEscape(buildUrl(siteUrl, path))}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`);

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

async function refreshSitemap(): Promise<string> {
  const supportedClubId = getSupportedClubIdFromEnv();
  const entities = await dbAll<SitemapRow>(
    `SELECT 'club' AS kind, c.IDCLUB AS id
     FROM CLUB c
     WHERE TRIM(COALESCE(c.IDCLUB, '')) <> ''
     UNION ALL
     SELECT 'joueur' AS kind, jr.IDJOUEUR AS id
     FROM JOUEURRG jr
     WHERE TRIM(COALESCE(jr.IDJOUEUR, '')) <> ''
     ORDER BY kind ASC, id ASC`,
  );

  const rencontres = await dbAll<RencontreRow>(
    `WITH current_season AS (
       SELECT COALESCE(NULLIF(TRIM(co.SAISON), ''), NULLIF(TRIM(r.SAISON), '')) AS saison
       FROM RENCO r
       LEFT JOIN TOUR t ON t.TUCLEUNIK = r.TUCLEUNIK
       LEFT JOIN COMPET co ON co.COCLEUNIK = t.COCLEUNIK
       WHERE (r.DOMICILE = ? OR r.EXTERIEUR = ?)
         AND COALESCE(NULLIF(TRIM(co.SAISON), ''), NULLIF(TRIM(r.SAISON), '')) IS NOT NULL
       ORDER BY saison DESC
       LIMIT 1
     )
     SELECT DISTINCT r.RECLEUNIK AS id
     FROM RENCO r
     LEFT JOIN TOUR t ON t.TUCLEUNIK = r.TUCLEUNIK
     LEFT JOIN COMPET co ON co.COCLEUNIK = t.COCLEUNIK
     CROSS JOIN current_season cs
     WHERE (r.DOMICILE = ? OR r.EXTERIEUR = ?)
       AND COALESCE(NULLIF(TRIM(co.SAISON), ''), NULLIF(TRIM(r.SAISON), '')) = cs.saison
     ORDER BY r.RECLEUNIK ASC`,
    [supportedClubId, supportedClubId, supportedClubId, supportedClubId],
  );

  return buildSitemapXml(entities, rencontres);
}

export async function getSitemapXml(): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.xml;
  }

  if (!refreshInProgress) {
    refreshInProgress = refreshSitemap()
      .then((xml) => {
        cache = { xml, expiresAt: Date.now() + CACHE_TTL_MS };
        return xml;
      })
      .finally(() => {
        refreshInProgress = null;
      });
  }

  return refreshInProgress;
}
