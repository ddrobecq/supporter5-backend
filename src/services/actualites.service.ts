import { XMLParser } from 'fast-xml-parser';
import db, { dbAll, dbGet } from '../config/database';
import { getSupportedClubIdFromEnv } from '../lib/supportedClub';

const MAX_ARTICLES = 8;
const RSS_FETCH_TIMEOUT_MS = 8_000;

interface RssSource { RSSID: number; RSSURL: string; RSSDescription: string | null; }
interface ClubRow { CLUB: string | null; }
interface ClubNameRow { CN_NOM: string | null; }
interface CompetitionRow { NOM: string | null; }
interface NewsRow {
  NEID: number;
  NEDate: string | null;
  NETitre: string | null;
  NEURL: string | null;
  NEResume: string | null;
  NESource: string | null;
  HAS_IMAGE: number;
}
interface NewsImageRow { NEImage: Buffer | null; }

export type ActualiteCategorie = 'Transferts' | 'Infirmerie' | 'Competitions' | 'Groupe' | 'Club';

export interface Actualite {
  id: string;
  titre: string;
  extrait: string;
  lien: string;
  source: string;
  publieLe: string;
  categorie: ActualiteCategorie;
  imageUrl?: string;
}

interface ParsedFeedItem { titre: string; extrait: string; lien: string; publieLe: string; imageUrl: string; }

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: true });

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}

function readText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  return String(record['#text'] ?? record.__cdata ?? '').trim();
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: '&', apos: "'", quot: '"', lt: '<', gt: '>', nbsp: ' ',
    laquo: '«', raquo: '»', lsquo: "'", rsquo: "'", ldquo: '"', rdquo: '"',
    ndash: '-', mdash: '-', hellip: '...', eacute: 'é', egrave: 'è', ecirc: 'ê',
    agrave: 'à', acirc: 'â', ugrave: 'ù', icirc: 'î', ocirc: 'ô', ccedil: 'ç',
  };

  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (match, decimal, hexadecimal, named) => {
    if (decimal || hexadecimal) {
      const codePoint = Number.parseInt(decimal || hexadecimal, hexadecimal ? 16 : 10);
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    return namedEntities[String(named).toLowerCase()] ?? match;
  });
}

function cleanExcerpt(value: string): string {
  const plain = decodeHtmlEntities(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return plain.length > 220 ? `${plain.slice(0, 217).trimEnd()}...` : plain;
}

function parseDate(value: unknown): string | null {
  const date = new Date(readText(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function readAtomLink(value: unknown): string {
  for (const link of asArray(value)) {
    if (typeof link === 'string') return link.trim();
    if (link && typeof link === 'object') {
      const record = link as Record<string, unknown>;
      const href = String(record['@_href'] ?? '').trim();
      const rel = String(record['@_rel'] ?? '').trim();
      if (href && (!rel || rel === 'alternate')) return href;
    }
  }
  return '';
}

function readImageUrl(item: Record<string, unknown>): string {
  const candidates = [...asArray(item.enclosure), ...asArray(item['media:content']), ...asArray(item['media:thumbnail'])];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const record = candidate as Record<string, unknown>;
    const url = String(record['@_url'] ?? record['@_href'] ?? '').trim();
    const mimeType = String(record['@_type'] ?? '').toLowerCase();
    if (url && (!mimeType || mimeType.startsWith('image/'))) return url;
  }
  return '';
}

function parseFeed(xml: string): ParsedFeedItem[] {
  const document = parser.parse(xml) as Record<string, unknown>;
  const channel = document.rss && typeof document.rss === 'object' ? (document.rss as Record<string, unknown>).channel as Record<string, unknown> | undefined : undefined;
  const atomFeed = document.feed && typeof document.feed === 'object' ? document.feed as Record<string, unknown> : undefined;
  const rawItems = channel ? asArray(channel.item) : atomFeed ? asArray(atomFeed.entry) : [];
  return rawItems.flatMap((rawItem) => {
    if (!rawItem || typeof rawItem !== 'object') return [];
    const item = rawItem as Record<string, unknown>;
    const titre = readText(item.title);
    const lien = readAtomLink(item.link);
    const publieLe = parseDate(item.pubDate ?? item.published ?? item.updated ?? item['dc:date']);
    const extrait = cleanExcerpt(readText(item.description ?? item.summary ?? item.content ?? item['content:encoded']));
    return titre && lien && publieLe ? [{ titre, lien, publieLe, extrait, imageUrl: readImageUrl(item) }] : [];
  });
}

function parisDay(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}

function isRecent(dateValue: string, now: Date): boolean {
  const published = new Date(dateValue);
  return parisDay(published) === parisDay(now) || parisDay(published) === parisDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));
}

function hasPhrase(text: string, phrase: string): boolean { return ` ${text} `.includes(` ${phrase} `); }

function isCalendarSubject(text: string): boolean {
  return ['calendrier', 'programme des matchs', 'programme des rencontres', 'horaire', 'coup d envoi', 'billetterie', 'places pour', 'report de match', 'match reporte'].some((keyword) => text.includes(keyword));
}

function categorize(text: string): ActualiteCategorie {
  if (['transfert', 'mercato', 'recrue', 'signature', 'pret', 'prolonge'].some((keyword) => text.includes(keyword))) return 'Transferts';
  if (['blessure', 'infirmerie', 'indisponible', 'forfait', 'retour de blessure'].some((keyword) => text.includes(keyword))) return 'Infirmerie';
  if (['tirage', 'champions league', 'ligue des champions', 'europa league', 'coupe'].some((keyword) => text.includes(keyword))) return 'Competitions';
  if (['groupe', 'entrainement', 'selection', 'convoque'].some((keyword) => text.includes(keyword))) return 'Groupe';
  return 'Club';
}

async function getClubAliases(): Promise<string[]> {
  const clubId = getSupportedClubIdFromEnv();
  const [club, history] = await Promise.all([
    dbGet<ClubRow>('SELECT "CLUB" FROM "CLUB" WHERE CAST("IDCLUB" AS TEXT) = ? LIMIT 1', [clubId]),
    dbAll<ClubNameRow>('SELECT "CN_NOM" FROM "CLUB_NOM" WHERE CAST("IDCLUB" AS TEXT) = ?', [clubId]),
  ]);
  const aliases = new Set<string>();
  for (const rawName of [club?.CLUB ?? '', ...history.map((row) => row.CN_NOM ?? '')]) {
    const fullName = normalize(rawName);
    if (!fullName) continue;
    aliases.add(fullName);
    aliases.add(fullName.replace(/\b(fc|football club)\b/g, '').replace(/\s+/g, ' ').trim());
    const finalPart = fullName.split(' ').at(-1) ?? '';
    if (finalPart.length >= 4) aliases.add(finalPart);
  }
  return [...aliases].filter((alias) => alias.length >= 3);
}

async function getClubCompetitionNames(): Promise<string[]> {
  const clubId = getSupportedClubIdFromEnv();
  const rows = await dbAll<CompetitionRow>(
    `SELECT DISTINCT c."NOM" AS "NOM"
     FROM "PARTICIP" p
     INNER JOIN "TOUR" t ON t."TUCLEUNIK" = p."TUCLEUNIK"
     INNER JOIN "COMPET" c ON c."COCLEUNIK" = t."COCLEUNIK"
     WHERE CAST(p."IDCLUB" AS TEXT) = ?`,
    [clubId],
  );
  return rows.map((row) => normalize(String(row.NOM ?? ''))).filter((name) => name.length >= 4);
}

async function fetchSource(source: RssSource): Promise<ParsedFeedItem[]> {
  const url = new URL(source.RSSURL);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return [];
  const response = await fetch(url, { signal: AbortSignal.timeout(RSS_FETCH_TIMEOUT_MS), headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' } });
  return response.ok ? parseFeed(await response.text()) : [];
}

async function loadActualites(): Promise<Actualite[]> {
  const [sources, aliases, competitionNames] = await Promise.all([
    dbAll<RssSource>('SELECT "RSSID", "RSSURL", "RSSDescription" FROM "RSS" WHERE TRIM("RSSURL") <> \'\' ORDER BY "RSSID"'),
    getClubAliases(),
    getClubCompetitionNames(),
  ]);
  if (aliases.length === 0) return [];
  const now = new Date();
  const results = await Promise.allSettled(sources.map(async (source) => ({ source, items: await fetchSource(source) })));
  const seen = new Set<string>();
  const actualites: Actualite[] = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { source, items } = result.value;
    for (const item of items) {
      const subject = normalize(`${item.titre} ${item.extrait}`);
      const title = normalize(item.titre);
      const mentionsClubInTitle = aliases.some((alias) => hasPhrase(title, alias));
      const isRelevantCompetitionDraw = title.includes('tirage') && competitionNames.some((name) => hasPhrase(title, name));
      if (!isRecent(item.publieLe, now) || (!mentionsClubInTitle && !isRelevantCompetitionDraw) || isCalendarSubject(subject)) continue;
      const dedupeKey = normalize(item.lien || item.titre);
      if (!dedupeKey || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      actualites.push({ id: `${source.RSSID}-${dedupeKey}`, titre: item.titre, extrait: item.extrait, lien: item.lien, source: String(source.RSSDescription ?? '').trim() || new URL(source.RSSURL).hostname, publieLe: item.publieLe, categorie: categorize(subject), imageUrl: item.imageUrl });
    }
  }
  return actualites.sort((left, right) => new Date(right.publieLe).getTime() - new Date(left.publieLe).getTime()).slice(0, MAX_ARTICLES);
}

async function downloadImage(urlValue: string | undefined): Promise<Buffer | null> {
  if (!urlValue) return null;
  try {
    const url = new URL(urlValue);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    const response = await fetch(url, { signal: AbortSignal.timeout(RSS_FETCH_TIMEOUT_MS), headers: { Accept: 'image/*' } });
    const contentType = String(response.headers.get('content-type') ?? '').toLowerCase();
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (!response.ok || !contentType.startsWith('image/') || contentLength > 5_000_000) return null;
    const image = Buffer.from(await response.arrayBuffer());
    return image.length > 0 && image.length <= 5_000_000 ? image : null;
  } catch {
    return null;
  }
}

async function persistActualites(actualites: Actualite[]): Promise<void> {
  const images = await Promise.all(actualites.map((item) => downloadImage(item.imageUrl)));
  const insert = db.prepare(
    `INSERT INTO "News" ("NEGUID", "NEDate", "NETitre", "NEEtat", "NEURL", "NEResume", "NEImage", "NESource")
    VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
  );
  const replaceAll = db.transaction((items: Actualite[], itemImages: Array<Buffer | null>) => {
    db.prepare('DELETE FROM "News"').run();
    for (const [index, item] of items.entries()) {
      insert.run(item.lien, item.publieLe, item.titre, item.lien, item.extrait, itemImages[index], item.source);
    }
  });
  replaceAll(actualites, images);
}

export async function refreshActualites(): Promise<number> {
  const actualites = await loadActualites();
  if (actualites.length === 0) {
    throw new Error('Aucune actualite RSS qualifiee recue; le snapshot News existant est conserve.');
  }
  await persistActualites(actualites);
  return actualites.length;
}

export async function getActualites(): Promise<Actualite[]> {
  const rows = await dbAll<NewsRow>(
    `SELECT "NEID", "NEDate", "NETitre", "NEURL", "NEResume", "NESource", CASE WHEN LENGTH("NEImage") > 0 THEN 1 ELSE 0 END AS "HAS_IMAGE"
     FROM "News"
     WHERE COALESCE("NEEtat", 1) = 1
     ORDER BY "NEDate" DESC, "NEID" DESC
     LIMIT ?`,
    [MAX_ARTICLES],
  );
  return rows.map((row) => {
    const titre = String(row.NETitre ?? '').trim();
    const extrait = String(row.NEResume ?? '').trim();
    return {
      id: String(row.NEID),
      titre,
      extrait,
      lien: String(row.NEURL ?? '').trim(),
      source: String(row.NESource ?? '').trim(),
      publieLe: String(row.NEDate ?? '').trim(),
      categorie: categorize(normalize(`${titre} ${extrait}`)),
      imageUrl: Number(row.HAS_IMAGE) === 1 ? `/api/actualites/${row.NEID}/image` : undefined,
    };
  });
}

export async function getActualiteImage(id: string): Promise<Buffer | null> {
  const row = await dbGet<NewsImageRow>('SELECT "NEImage" FROM "News" WHERE "NEID" = ? LIMIT 1', [id]);
  return row?.NEImage?.length ? row.NEImage : null;
}