#!/usr/bin/env node
/**
 * Downloads the DB-IP Lite Country database (CC BY 4.0, https://db-ip.com) used to resolve the visitor country.
 * Usage: node scripts/update-geoip.js   (or: npm run geoip:update)
 *
 * Target: GEOIP_DB_PATH, by default "dbip-country-lite.mmdb" next to the SQLite database (SQLITE_DB_PATH);
 * relative paths are resolved from the working directory, as for SQLITE_DB_PATH.
 * Tries the current UTC month, then the previous one when the file is not published yet (404).
 * The gunzipped file is written to a temporary file in the same directory, then renamed (atomic replace).
 * Also launched in the background by the server when the file is older than 35 days.
 */
const path = require('node:path');
const fs = require('node:fs');
const zlib = require('node:zlib');
const dotenv = require('dotenv');

dotenv.config();

const DOWNLOAD_TIMEOUT_MS = 60_000;
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
const MMDB_METADATA_MARKER = Buffer.from([0xab, 0xcd, 0xef, ...Buffer.from('MaxMind.com')]);

function resolveTargetPath() {
  const configured = (process.env.GEOIP_DB_PATH ?? '').trim();
  if (configured) return path.resolve(process.cwd(), configured);
  const dbPath = path.resolve(process.cwd(), (process.env.SQLITE_DB_PATH ?? './data/supporter.sqlite').trim());
  return path.join(path.dirname(dbPath), 'dbip-country-lite.mmdb');
}

function monthUrl(date) {
  const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  return `https://download.db-ip.com/free/dbip-country-lite-${month}.mmdb.gz`;
}

/** Gzipped body of `url`, or null on 404. */
async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS), redirect: 'follow' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const body = Buffer.from(await response.arrayBuffer());
  if (body.length > MAX_DOWNLOAD_BYTES) throw new Error(`download too large (${body.length} bytes)`);
  return body;
}

async function main() {
  const target = resolveTargetPath();
  const now = new Date();
  const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  let url = monthUrl(now);
  let gzipped = await download(url);
  if (!gzipped) {
    console.info(`not published yet: ${url}`);
    url = monthUrl(previous);
    gzipped = await download(url);
  }
  if (!gzipped) throw new Error(`not found: ${url}`);

  const mmdb = zlib.gunzipSync(gzipped, { maxOutputLength: MAX_DOWNLOAD_BYTES * 4 });
  if (mmdb.lastIndexOf(MMDB_METADATA_MARKER) < 0) throw new Error('downloaded file is not a MaxMind DB');

  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, mmdb);
    fs.renameSync(temp, target);
  } catch (error) {
    fs.rmSync(temp, { force: true });
    throw error;
  }
  console.info(`geoip ${url} -> ${target} (${mmdb.length} bytes)`);
}

main().catch((error) => {
  console.error(`geoip update failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
