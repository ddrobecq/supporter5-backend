#!/usr/bin/env node
/**
 * One-off, idempotent creation of the indexes used by the backend queries (audit O8).
 * Usage: node scripts/create-indexes.js <path/to/database.sqlite> [--dry-run]
 *   (or: npm run db:indexes -- <path/to/database.sqlite> [--dry-run])
 *
 * Each index is justified by an EXPLAIN QUERY PLAN that switches from SCAN to SEARCH:
 * - MATCH(IDARBITRE): can-delete arbitre (checkArbitreIntegrity, COUNT ... WHERE IDARBITRE = ?).
 * - MATCH(TECLEUNIK): can-delete terrain (checkTerrainIntegrity, COUNT ... WHERE TECLEUNIK = ?).
 * - RENCO(PADOMSource) / RENCO(PAEXTSource), partial WHERE <> '': propagation of programmed
 *   participants (rencontres.service, UPDATE "RENCO" ... WHERE "PADOMSource" = ? AND "PADOMSource" <> '').
 * - PARTICIP(PASource), partial WHERE <> '': unresolved programmed participants read by the propagation
 *   (SELECT ... WHERE "PASource" <> '' ... ORDER BY +"PACLEUNIK"). The existing full index WDIDX_PARTICIP_PASource
 *   cannot serve "<> ''", hence a distinct partial index.
 * RENCO(ETAT) already exists (WDIDX_RENCO_ETAT) and serves `"ETAT" = 5`: nothing to add.
 * No ANALYZE: the database has no sqlite_stat1, and creating statistics would change the planner's
 * choices for every query, not only for these indexes.
 */
const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

const INDEXES = [
  { name: 'WDIDX_MATCH_IDARBITRE', table: 'MATCH', columns: ['IDARBITRE'], where: null },
  { name: 'WDIDX_MATCH_TECLEUNIK', table: 'MATCH', columns: ['TECLEUNIK'], where: null },
  { name: 'WDIDX_RENCO_PADOMSOURCE', table: 'RENCO', columns: ['PADOMSource'], where: `"PADOMSource" <> ''` },
  { name: 'WDIDX_RENCO_PAEXTSOURCE', table: 'RENCO', columns: ['PAEXTSource'], where: `"PAEXTSource" <> ''` },
  { name: 'WDIDX_PARTICIP_PASOURCE_SET', table: 'PARTICIP', columns: ['PASource'], where: `"PASource" <> ''` },
];

function parseArgs(argv) {
  const args = { dbPath: null, dryRun: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (!args.dbPath) args.dbPath = arg;
  }
  return args;
}

/** Name of an existing index on exactly the same column list and of the same kind (partial or full), or null. */
function findEquivalentIndex(db, table, columns, partial) {
  for (const index of db.prepare('SELECT name, partial FROM pragma_index_list(?)').all(table)) {
    if (Boolean(index.partial) !== partial) continue;
    const indexColumns = db.prepare('SELECT name FROM pragma_index_info(?) ORDER BY seqno').all(index.name).map((row) => row.name);
    if (indexColumns.length === columns.length && indexColumns.every((col, i) => col.toUpperCase() === columns[i].toUpperCase())) {
      return index.name;
    }
  }
  return null;
}

function main() {
  const { dbPath, dryRun } = parseArgs(process.argv);
  if (!dbPath) {
    console.error('Usage: node scripts/create-indexes.js <path/to/database.sqlite> [--dry-run]');
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
    const toCreate = [];
    for (const index of INDEXES) {
      const existing = findEquivalentIndex(db, index.table, index.columns, Boolean(index.where));
      if (existing) {
        console.log(`skip   ${index.name}: equivalent index ${existing} already on ${index.table}(${index.columns.join(', ')})`);
      } else {
        toCreate.push(index);
      }
    }

    const statements = toCreate.map((index) => {
      const cols = index.columns.map((col) => `"${col}"`).join(', ');
      return `CREATE INDEX IF NOT EXISTS "${index.name}" ON "${index.table}" (${cols})${index.where ? ` WHERE ${index.where}` : ''}`;
    });
    if (dryRun) {
      statements.forEach((sql) => console.log(`dry-run ${sql}`));
      return;
    }
    db.transaction(() => statements.forEach((sql) => db.exec(sql)))();
    toCreate.forEach((index) => console.log(`create ${index.name}`));

    for (const table of [...new Set(INDEXES.map((index) => index.table))]) {
      const names = db.prepare('SELECT name, partial FROM pragma_index_list(?)').all(table)
        .map((row) => `${row.name}${row.partial ? ' (partial)' : ''}`);
      console.log(`index_list ${table}: ${names.join(', ')}`);
    }
  } finally {
    db.close();
  }
}

main();
