-- Malus : colonne PARTICIP.PAMalus (entier, total des points retires) -> table MALUS historisee, une ligne par malus, rattachee a PACLEUNIK.
-- MALUS.MLPoints > 0 (points retires) ; MLMotif NULL = pas de motif ; MLDate 'YYYY-MM-DD' ou '' = inconnue (convention actuelle des dates vides).
-- Les PAMalus existants sont repris en une ligne par participant, sans motif ni date.
-- Compatible console d'admin : UNE instruction a la fois, dans l'ordre ; idempotent (CREATE ... IF NOT EXISTS, INSERT ... NOT EXISTS).
-- Prealables verifies (data/models/target-sqlite-model.sql) : aucun index, vue ni trigger sur PAMalus ; pas de CHECK ;
-- le NOT NULL de PAMalus ne bloque pas DROP COLUMN. C3 le reverifie sur la base reelle.
-- Les requetes C* sont des controles en lecture : elles doivent renvoyer le resultat indique avant de continuer.

-- C0 (avant) : comptes de reference, a noter. Attendu : negatifs = 0 (sinon s'arreter).
SELECT COUNT(*) AS total, SUM("PAMalus" > 0) AS avec_malus, SUM("PAMalus" < 0) AS negatifs, SUM("PAMalus") AS points FROM "PARTICIP";

-- 1. Table et index
CREATE TABLE IF NOT EXISTS "MALUS" ("MLCLEUNIK" INTEGER PRIMARY KEY, "PACLEUNIK" INTEGER NOT NULL, "MLPoints" INTEGER NOT NULL, "MLMotif" VARCHAR(100), "MLDate" VARCHAR(10) NOT NULL, FOREIGN KEY ("PACLEUNIK") REFERENCES "PARTICIP" ("PACLEUNIK"));
CREATE INDEX IF NOT EXISTS "WDIDX_MALUS_PACLEUNIK" ON "MALUS" ("PACLEUNIK");

-- 2. Reprise des malus existants (un participant deja present dans MALUS n'est pas repris une seconde fois)
INSERT INTO "MALUS" ("PACLEUNIK", "MLPoints", "MLMotif", "MLDate") SELECT p."PACLEUNIK", p."PAMalus", NULL, '' FROM "PARTICIP" p WHERE p."PAMalus" > 0 AND NOT EXISTS (SELECT 1 FROM "MALUS" m WHERE m."PACLEUNIK" = p."PACLEUNIK");

-- C1 (apres reprise) : attendu ecarts = 0, lignes_malus = C0.avec_malus, points_malus = C0.points, orphelins = 0.
SELECT
  (SELECT COUNT(*) FROM "PARTICIP" p WHERE COALESCE(p."PAMalus", 0) <> COALESCE((SELECT SUM(m."MLPoints") FROM "MALUS" m WHERE m."PACLEUNIK" = p."PACLEUNIK"), 0)) AS ecarts,
  (SELECT COUNT(*) FROM "MALUS") AS lignes_malus,
  (SELECT SUM("MLPoints") FROM "MALUS") AS points_malus,
  (SELECT COUNT(*) FROM "MALUS" m WHERE NOT EXISTS (SELECT 1 FROM "PARTICIP" p WHERE p."PACLEUNIK" = m."PACLEUNIK")) AS orphelins;

-- C2 (apres reprise) : schema. Attendu : MLCLEUNIK, PACLEUNIK, MLPoints, MLMotif (notnull 0), MLDate ; index WDIDX_MALUS_PACLEUNIK present.
SELECT cid, name, type, "notnull", pk FROM pragma_table_info('MALUS');
SELECT name FROM pragma_index_list('MALUS');

-- ============================================================================================
-- 3. UNIQUEMENT APRES deploiement du nouveau code (l'ancien code insere encore PAMalus dans PARTICIP).
-- ============================================================================================

-- C3 (avant DROP) : aucun index, vue ni trigger ne reference PAMalus. Attendu : aucune ligne.
SELECT type, name FROM sqlite_master WHERE type IN ('index', 'view', 'trigger') AND sql LIKE '%PAMalus%';

-- C4 (avant DROP, a relancer juste avant) : attendu ecarts = 0 (aucun PAMalus modifie depuis la reprise).
SELECT COUNT(*) AS ecarts FROM "PARTICIP" p WHERE COALESCE(p."PAMalus", 0) <> COALESCE((SELECT SUM(m."MLPoints") FROM "MALUS" m WHERE m."PACLEUNIK" = p."PACLEUNIK"), 0);

ALTER TABLE "PARTICIP" DROP COLUMN "PAMalus";

-- C5 (apres DROP) : attendu 0.
SELECT COUNT(*) AS reste_pamalus FROM pragma_table_info('PARTICIP') WHERE name = 'PAMalus';

-- C6 (apres) : integrite. Attendu : ok
SELECT * FROM pragma_quick_check;
