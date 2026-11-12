-- Couleurs : entier WinDev BGR (r + g*256 + b*65536, -1 = aucune couleur) -> texte '#RRGGBB' (majuscules), NULL = aucune couleur.
-- Colonnes : CLUB.FOND, CLUB.TEXTE, Qualif.CLASS_Couleur. APP_THEME est deja en #RRGGBB : non concerne.
-- Compatible console d'admin : UNE instruction a la fois, dans l'ordre ; uniquement ALTER TABLE ADD/DROP/RENAME COLUMN et UPDATE.
-- Prealables verifies (base de dev, 2026-11) : aucun index, vue ni trigger sur ces colonnes ; pas de CHECK ;
-- le NOT NULL des anciennes colonnes ne bloque pas DROP COLUMN ; les nouvelles colonnes sont nullables.
-- Sens BGR = front cssColorToDbColor (red + (green << 8) + (blue << 16)) : 255 -> #FF0000, 16711680 -> #0000FF.
-- Apres RENAME, les colonnes se retrouvent en fin de table (position sans effet : le code les lit par nom).
-- Les requetes C* sont des controles en lecture : elles doivent renvoyer le resultat indique avant de continuer.

-- C0 (avant) : comptes de reference, a noter.
SELECT 'CLUB.FOND' AS col, COUNT(*) AS total, SUM(FOND = -1) AS aucune, SUM(FOND < -1 OR FOND > 16777215) AS hors_bornes, COUNT(DISTINCT FOND) AS distinctes FROM CLUB
UNION ALL SELECT 'CLUB.TEXTE', COUNT(*), SUM(TEXTE = -1), SUM(TEXTE < -1 OR TEXTE > 16777215), COUNT(DISTINCT TEXTE) FROM CLUB
UNION ALL SELECT 'Qualif.CLASS_Couleur', COUNT(*), SUM(CLASS_Couleur = -1), SUM(CLASS_Couleur < -1 OR CLASS_Couleur > 16777215), COUNT(DISTINCT CLASS_Couleur) FROM Qualif;
-- Attendu : hors_bornes = 0 partout (sinon s'arreter).

-- C1 (avant) : valeurs connues du sens BGR. Attendu : #FF0000 | #0000FF | #00FF00
SELECT printf('#%02X%02X%02X', 255 & 255, (255 >> 8) & 255, (255 >> 16) & 255) AS rouge,
       printf('#%02X%02X%02X', 16711680 & 255, (16711680 >> 8) & 255, (16711680 >> 16) & 255) AS bleu,
       printf('#%02X%02X%02X', 65280 & 255, (65280 >> 8) & 255, (65280 >> 16) & 255) AS vert;

-- 1. CLUB.FOND
ALTER TABLE "CLUB" ADD COLUMN "FOND_HEX" VARCHAR(7);
UPDATE "CLUB" SET "FOND_HEX" = CASE WHEN "FOND" IS NULL OR "FOND" < 0 THEN NULL ELSE printf('#%02X%02X%02X', "FOND" & 255, ("FOND" >> 8) & 255, ("FOND" >> 16) & 255) END;
-- C2 aller-retour (attendu : 0) : le hex reconverti en entier BGR redonne exactement l'entier d'origine.
SELECT COUNT(*) AS ecarts FROM "CLUB" WHERE NOT (
  ("FOND" < 0 AND "FOND_HEX" IS NULL) OR ("FOND" >= 0 AND "FOND_HEX" IS NOT NULL AND
   ((instr('0123456789ABCDEF', substr("FOND_HEX", 2, 1)) - 1) * 16 + instr('0123456789ABCDEF', substr("FOND_HEX", 3, 1)) - 1)
   + ((instr('0123456789ABCDEF', substr("FOND_HEX", 4, 1)) - 1) * 16 + instr('0123456789ABCDEF', substr("FOND_HEX", 5, 1)) - 1) * 256
   + ((instr('0123456789ABCDEF', substr("FOND_HEX", 6, 1)) - 1) * 16 + instr('0123456789ABCDEF', substr("FOND_HEX", 7, 1)) - 1) * 65536
   = "FOND"));
ALTER TABLE "CLUB" DROP COLUMN "FOND";
ALTER TABLE "CLUB" RENAME COLUMN "FOND_HEX" TO "FOND";

-- 2. CLUB.TEXTE
ALTER TABLE "CLUB" ADD COLUMN "TEXTE_HEX" VARCHAR(7);
UPDATE "CLUB" SET "TEXTE_HEX" = CASE WHEN "TEXTE" IS NULL OR "TEXTE" < 0 THEN NULL ELSE printf('#%02X%02X%02X', "TEXTE" & 255, ("TEXTE" >> 8) & 255, ("TEXTE" >> 16) & 255) END;
-- C3 aller-retour (attendu : 0)
SELECT COUNT(*) AS ecarts FROM "CLUB" WHERE NOT (
  ("TEXTE" < 0 AND "TEXTE_HEX" IS NULL) OR ("TEXTE" >= 0 AND "TEXTE_HEX" IS NOT NULL AND
   ((instr('0123456789ABCDEF', substr("TEXTE_HEX", 2, 1)) - 1) * 16 + instr('0123456789ABCDEF', substr("TEXTE_HEX", 3, 1)) - 1)
   + ((instr('0123456789ABCDEF', substr("TEXTE_HEX", 4, 1)) - 1) * 16 + instr('0123456789ABCDEF', substr("TEXTE_HEX", 5, 1)) - 1) * 256
   + ((instr('0123456789ABCDEF', substr("TEXTE_HEX", 6, 1)) - 1) * 16 + instr('0123456789ABCDEF', substr("TEXTE_HEX", 7, 1)) - 1) * 65536
   = "TEXTE"));
ALTER TABLE "CLUB" DROP COLUMN "TEXTE";
ALTER TABLE "CLUB" RENAME COLUMN "TEXTE_HEX" TO "TEXTE";

-- 3. Qualif.CLASS_Couleur
ALTER TABLE "Qualif" ADD COLUMN "CLASS_Couleur_HEX" VARCHAR(7);
UPDATE "Qualif" SET "CLASS_Couleur_HEX" = CASE WHEN "CLASS_Couleur" IS NULL OR "CLASS_Couleur" < 0 THEN NULL ELSE printf('#%02X%02X%02X', CAST("CLASS_Couleur" AS INTEGER) & 255, (CAST("CLASS_Couleur" AS INTEGER) >> 8) & 255, (CAST("CLASS_Couleur" AS INTEGER) >> 16) & 255) END;
-- C4 aller-retour (attendu : 0)
SELECT COUNT(*) AS ecarts FROM "Qualif" WHERE NOT (
  ("CLASS_Couleur" < 0 AND "CLASS_Couleur_HEX" IS NULL) OR ("CLASS_Couleur" >= 0 AND "CLASS_Couleur_HEX" IS NOT NULL AND
   ((instr('0123456789ABCDEF', substr("CLASS_Couleur_HEX", 2, 1)) - 1) * 16 + instr('0123456789ABCDEF', substr("CLASS_Couleur_HEX", 3, 1)) - 1)
   + ((instr('0123456789ABCDEF', substr("CLASS_Couleur_HEX", 4, 1)) - 1) * 16 + instr('0123456789ABCDEF', substr("CLASS_Couleur_HEX", 5, 1)) - 1) * 256
   + ((instr('0123456789ABCDEF', substr("CLASS_Couleur_HEX", 6, 1)) - 1) * 16 + instr('0123456789ABCDEF', substr("CLASS_Couleur_HEX", 7, 1)) - 1) * 65536
   = "CLASS_Couleur"));
ALTER TABLE "Qualif" DROP COLUMN "CLASS_Couleur";
ALTER TABLE "Qualif" RENAME COLUMN "CLASS_Couleur_HEX" TO "CLASS_Couleur";

-- C5 (apres) : nulls = C0.aucune (les -1) ; distinctes_non_null = C0.distinctes - 1 si C0.aucune > 0 (le -1 devient NULL, non compte) ;
-- format : aucune valeur hors '#RRGGBB'.
SELECT 'CLUB.FOND' AS col, COUNT(*) AS total, SUM(FOND IS NULL) AS nulls, COUNT(DISTINCT FOND) AS distinctes_non_null,
       SUM(FOND IS NOT NULL AND (length(FOND) <> 7 OR FOND NOT GLOB '#[0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F]')) AS mauvais_format FROM CLUB
UNION ALL SELECT 'CLUB.TEXTE', COUNT(*), SUM(TEXTE IS NULL), COUNT(DISTINCT TEXTE),
       SUM(TEXTE IS NOT NULL AND (length(TEXTE) <> 7 OR TEXTE NOT GLOB '#[0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F]')) FROM CLUB
UNION ALL SELECT 'Qualif.CLASS_Couleur', COUNT(*), SUM(CLASS_Couleur IS NULL), COUNT(DISTINCT CLASS_Couleur),
       SUM(CLASS_Couleur IS NOT NULL AND (length(CLASS_Couleur) <> 7 OR CLASS_Couleur NOT GLOB '#[0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F][0-9A-F]')) FROM Qualif;

-- C6 (apres) : schema. Attendu : FOND, TEXTE et CLASS_Couleur en VARCHAR(7), notnull = 0, en fin de table.
SELECT 'CLUB' AS t, cid, name, type, "notnull" FROM pragma_table_info('CLUB') WHERE name IN ('FOND', 'TEXTE')
UNION ALL SELECT 'Qualif', cid, name, type, "notnull" FROM pragma_table_info('Qualif') WHERE name = 'CLASS_Couleur';

-- C7 (apres) : integrite. Attendu : ok
SELECT * FROM pragma_quick_check;
