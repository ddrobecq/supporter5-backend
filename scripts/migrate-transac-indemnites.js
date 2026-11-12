#!/usr/bin/env node
/**
 * One-off, idempotent migration of TRANSAC.INDEMNITES to the "option A" convention:
 *   NULL = unknown fee, 0 = no fee (known), > 0 = amount. The former -1 marker disappears.
 * Usage: node scripts/migrate-transac-indemnites.js <path/to/database.sqlite> [--dry-run]
 *   (or: npm run db:migrate-indemnites -- <path/to/database.sqlite> [--dry-run])
 *
 * SQLite cannot drop a NOT NULL constraint in place, so the table is rebuilt in ONE transaction:
 *   CREATE TABLE "TRANSAC_NEW" (real CREATE SQL from sqlite_master, INDEMNITES without NOT NULL)
 *   INSERT ... SELECT with INDEMNITES: 0 -> NULL, -1 -> 0, other values unchanged
 *   DROP TABLE "TRANSAC"; ALTER TABLE "TRANSAC_NEW" RENAME TO "TRANSAC"; indexes recreated as they were.
 * Checks before COMMIT (any failure rolls everything back): same row count, same values on every column
 * except INDEMNITES, expected NULL / 0 / > 0 counts, remaining negatives reported (never altered), quick_check ok.
 * Skipped when INDEMNITES is already nullable (pragma table_info.notnull = 0). Never run at application start.
 */
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');

const TABLE = 'TRANSAC';
const NEW_TABLE = 'TRANSAC_NEW';
const COLUMN = 'INDEMNITES';

function parseArgs(argv) {
  const args = { dbPath: null, dryRun: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--dry-run') args.dryRun = true;
    else if (!args.dbPath) args.dbPath = arg;
  }
  return args;
}

/** sha1 of every row (ordered by PK) over the given columns. */
function hashRows(db, table, columns) {
  const hash = crypto.createHash('sha1');
  const list = columns.map((col) => `"${col}"`).join(', ');
  for (const row of db.prepare(`SELECT ${list} FROM "${table}" ORDER BY "TNCLEUNIK"`).iterate()) {
    hash.update(JSON.stringify(row));
  }
  return hash.digest('hex');
}

function counts(db, table) {
  return db.prepare(
    `SELECT COUNT(*) AS total,
            SUM("${COLUMN}" IS NULL) AS nul,
            SUM("${COLUMN}" = 0) AS zero,
            SUM("${COLUMN}" = -1) AS minusOne,
            SUM("${COLUMN}" > 0) AS positive,
            SUM("${COLUMN}" < 0 AND "${COLUMN}" <> -1) AS otherNegative
     FROM "${table}"`,
  ).get();
}

function fail(message) {
  throw new Error(`Migration aborted (rolled back): ${message}`);
}

function main() {
  const { dbPath, dryRun } = parseArgs(process.argv);
  if (!dbPath) {
    console.error('Usage: node scripts/migrate-transac-indemnites.js <path/to/database.sqlite> [--dry-run]');
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
    const column = db.prepare('SELECT name, type, "notnull" FROM pragma_table_info(?) WHERE name = ?').get(TABLE, COLUMN);
    if (!column) fail(`${TABLE}.${COLUMN} not found`);
    if (column.notnull === 0) {
      console.log(`skip   ${TABLE}.${COLUMN} is already nullable: nothing to do`);
      return;
    }

    // Objects that would be broken by the rebuild: none expected (checked, never silently ignored).
    const dependents = db.prepare(
      `SELECT type, name FROM sqlite_master
       WHERE type IN ('view', 'trigger') AND (tbl_name = ? OR sql LIKE ?)`,
    ).all(TABLE, `%${TABLE}%`);
    const referencing = db.prepare(
      `SELECT m.name FROM sqlite_master m, pragma_foreign_key_list(m.name) f
       WHERE m.type = 'table' AND f."table" = ?`,
    ).all(TABLE);
    if (dependents.length || referencing.length) {
      fail(`objects depend on ${TABLE}: ${JSON.stringify({ dependents, referencing })}`);
    }
    if (db.prepare('SELECT 1 FROM sqlite_master WHERE name = ?').get(NEW_TABLE)) fail(`${NEW_TABLE} already exists`);

    const createSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(TABLE).sql;
    const notNullPattern = new RegExp(`("${COLUMN}"\\s+NUMERIC\\(24,6\\))\\s+NOT NULL`);
    if (!notNullPattern.test(createSql)) fail(`unexpected CREATE TABLE for ${TABLE}: ${createSql}`);
    const newCreateSql = createSql
      .replace(new RegExp(`^CREATE TABLE\\s+"${TABLE}"`), `CREATE TABLE "${NEW_TABLE}"`)
      .replace(notNullPattern, '$1');
    if (!newCreateSql.startsWith(`CREATE TABLE "${NEW_TABLE}"`)) fail('could not rename the table in its CREATE SQL');

    const indexSql = db.prepare(
      "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL ORDER BY name",
    ).all(TABLE);
    const columns = db.prepare('SELECT name FROM pragma_table_info(?) ORDER BY cid').all(TABLE).map((row) => row.name);
    const otherColumns = columns.filter((name) => name !== COLUMN);
    const list = columns.map((col) => `"${col}"`).join(', ');
    const select = columns.map((col) => (col === COLUMN
      ? `CASE WHEN "${COLUMN}" = 0 THEN NULL WHEN "${COLUMN}" = -1 THEN 0 ELSE "${COLUMN}" END`
      : `"${col}"`)).join(', ');
    const statements = [
      newCreateSql,
      `INSERT INTO "${NEW_TABLE}" (${list}) SELECT ${select} FROM "${TABLE}"`,
      `DROP TABLE "${TABLE}"`,
      `ALTER TABLE "${NEW_TABLE}" RENAME TO "${TABLE}"`,
      ...indexSql.map((index) => index.sql),
    ];

    const before = counts(db, TABLE);
    console.log(`before ${JSON.stringify(before)}`);
    if (dryRun) {
      statements.forEach((sql) => console.log(`dry-run ${sql.replace(/\s+/g, ' ')}`));
      console.log(`dry-run expected after: NULL=${before.zero} 0=${before.minusOne} >0=${before.positive} other negatives=${before.otherNegative}`);
      return;
    }

    const beforeHash = hashRows(db, TABLE, otherColumns);
    const beforeMapping = db.prepare(
      `SELECT "TNCLEUNIK", CASE WHEN "${COLUMN}" = 0 THEN NULL WHEN "${COLUMN}" = -1 THEN 0 ELSE "${COLUMN}" END AS v
       FROM "${TABLE}" ORDER BY "TNCLEUNIK"`,
    ).all();

    db.transaction(() => {
      statements.forEach((sql) => db.exec(sql));

      const after = counts(db, TABLE);
      if (after.total !== before.total) fail(`row count ${before.total} -> ${after.total}`);
      if (hashRows(db, TABLE, otherColumns) !== beforeHash) fail('values changed outside INDEMNITES');
      const afterMapping = db.prepare(`SELECT "TNCLEUNIK", "${COLUMN}" AS v FROM "${TABLE}" ORDER BY "TNCLEUNIK"`).all();
      if (JSON.stringify(afterMapping) !== JSON.stringify(beforeMapping)) fail('INDEMNITES not converted as expected');
      if (after.nul !== before.zero || after.zero !== before.minusOne || after.positive !== before.positive
        || after.minusOne !== 0 || after.otherNegative !== before.otherNegative) {
        fail(`unexpected counts after: ${JSON.stringify(after)}`);
      }
      const notnull = db.prepare('SELECT "notnull" FROM pragma_table_info(?) WHERE name = ?').get(TABLE, COLUMN).notnull;
      if (notnull !== 0) fail(`${COLUMN} is still NOT NULL`);
      const indexesAfter = db.prepare(
        "SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ? AND sql IS NOT NULL ORDER BY name",
      ).all(TABLE);
      if (JSON.stringify(indexesAfter) !== JSON.stringify(indexSql)) fail('indexes differ after the rebuild');
      const quickCheck = db.pragma('quick_check', { simple: true });
      if (quickCheck !== 'ok') fail(`quick_check: ${quickCheck}`);
      console.log(`after  ${JSON.stringify(after)}`);
    })();

    const negatives = db.prepare(`SELECT "TNCLEUNIK", "IDJOUEUR", "DATE", "TYPE", "${COLUMN}" FROM "${TABLE}" WHERE "${COLUMN}" < 0`).all();
    if (negatives.length) {
      console.log(`warning negative ${COLUMN} left unchanged (to be fixed by hand): ${JSON.stringify(negatives)}`);
    }
    console.log(`done   ${TABLE}.${COLUMN} nullable, ${indexSql.length} indexes recreated, quick_check ok`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
