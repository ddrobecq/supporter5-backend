#!/usr/bin/env node
/**
 * Idempotent creation of the audience tracking tables (cookie-free, no IP stored).
 * Usage: node scripts/migrate-trafic.js <path/to/database.sqlite> [--dry-run]
 *   (or: npm run db:migrate-trafic -- <path/to/database.sqlite> [--dry-run])
 *
 * - TRAFIC_HIT: one row per page view, kept 13 months (then aggregated into TRAFIC_JOUR and purged by the server).
 *   TH_DATE is an ISO UTC timestamp ("YYYY-MM-DDTHH:MM:SS.sssZ"), so day / hour are its first 10 / 13 characters.
 * - TRAFIC_JOUR: daily aggregates per dimension ('total', 'hour', 'page', 'referrer', 'country', 'device',
 *   'browser', 'os') and value, split by bot flag. Visits and visitors never span two UTC days (the visitor hash
 *   salt changes every day), so summing days is exact.
 * Every statement uses IF NOT EXISTS: running the script twice changes nothing. Never run at application start.
 */
const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "TRAFIC_HIT" (
    "TH_ID" INTEGER PRIMARY KEY,
    "TH_DATE" TEXT NOT NULL,
    "TH_PATH" TEXT NOT NULL,
    "TH_ENTITY_TYPE" TEXT NOT NULL DEFAULT '' CHECK ("TH_ENTITY_TYPE" IN ('', 'club', 'joueur', 'rencontre')),
    "TH_ENTITY_ID" TEXT NULL,
    "TH_REFERRER" TEXT NOT NULL DEFAULT '',
    "TH_COUNTRY" TEXT NOT NULL DEFAULT '',
    "TH_DEVICE" TEXT NOT NULL CHECK ("TH_DEVICE" IN ('desktop', 'mobile', 'tablet')),
    "TH_BROWSER" TEXT NOT NULL,
    "TH_OS" TEXT NOT NULL,
    "TH_VISITOR" TEXT NOT NULL,
    "TH_VISIT" TEXT NOT NULL,
    "TH_BOT" INTEGER NOT NULL DEFAULT 0 CHECK ("TH_BOT" IN (0, 1))
  )`,
  'CREATE INDEX IF NOT EXISTS "IDX_TRAFIC_HIT_DATE" ON "TRAFIC_HIT" ("TH_DATE", "TH_BOT")',
  'CREATE INDEX IF NOT EXISTS "IDX_TRAFIC_HIT_VISIT" ON "TRAFIC_HIT" ("TH_VISIT", "TH_ID")',
  `CREATE TABLE IF NOT EXISTS "TRAFIC_JOUR" (
    "TJ_DAY" TEXT NOT NULL,
    "TJ_DIMENSION" TEXT NOT NULL,
    "TJ_VALUE" TEXT NOT NULL,
    "TJ_BOT" INTEGER NOT NULL CHECK ("TJ_BOT" IN (0, 1)),
    "TJ_PAGE_VIEWS" INTEGER NOT NULL DEFAULT 0,
    "TJ_VISITS" INTEGER NOT NULL DEFAULT 0,
    "TJ_VISITORS" INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY ("TJ_DAY", "TJ_DIMENSION", "TJ_VALUE", "TJ_BOT")
  ) WITHOUT ROWID`,
  'CREATE INDEX IF NOT EXISTS "IDX_TRAFIC_JOUR_DIMENSION" ON "TRAFIC_JOUR" ("TJ_DIMENSION", "TJ_DAY")',
];

function parseArgs(argv) {
  const args = { dbPath: null, dryRun: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (!args.dbPath) args.dbPath = arg;
  }
  return args;
}

function main() {
  const { dbPath, dryRun } = parseArgs(process.argv);
  if (!dbPath) {
    console.error('Usage: node scripts/migrate-trafic.js <path/to/database.sqlite> [--dry-run]');
    process.exitCode = 1;
    return;
  }
  const resolved = path.resolve(process.cwd(), dbPath);
  if (!fs.existsSync(resolved)) {
    console.error(`Database not found: ${resolved}`);
    process.exitCode = 1;
    return;
  }

  const db = new Database(resolved, { fileMustExist: true });
  try {
    console.log(`Database: ${resolved} (journal_mode=${db.pragma('journal_mode', { simple: true })})`);
    const existing = db.prepare("SELECT name FROM sqlite_master WHERE name LIKE 'TRAFIC%' OR name LIKE 'IDX_TRAFIC%'").all()
      .map((row) => row.name);
    console.log(`before ${existing.length ? existing.join(', ') : '(no trafic object)'}`);
    if (dryRun) {
      STATEMENTS.forEach((sql) => console.log(`dry-run ${sql.replace(/\s+/g, ' ')}`));
      return;
    }
    db.transaction(() => STATEMENTS.forEach((sql) => db.exec(sql)))();
    const after = db.prepare("SELECT type, name FROM sqlite_master WHERE name LIKE 'TRAFIC%' OR name LIKE 'IDX_TRAFIC%' ORDER BY type DESC, name")
      .all().map((row) => `${row.type} ${row.name}`);
    console.log(`after  ${after.join(', ')}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
