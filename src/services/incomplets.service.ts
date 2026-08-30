import { dbAll } from '../config/database';
import { getSupportedClubIdFromEnv } from '../lib/supportedClub';

export interface JoueurIncompletRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string | null;
  SURNOM: string | null;
  IDNATIO: string | null;
  NAISSANCE: string | null;
  APPARITION: number;
  MATCHES_CALCULES: number;
  SANS_PRENOM: number;
  SANS_NAISSANCE: number;
  SANS_LIEU_NAISSANCE: number;
  SANS_MENSURATIONS: number;
  MATCHES_INCOMPLETS: number;
  SANS_PORTRAIT: number;
}

/** Outils > Fiches incompletes : un joueur est incomplet des qu'au moins un des indicateurs vaut 1. */
export async function getJoueursIncomplets(): Promise<JoueurIncompletRow[]> {
  return dbAll<JoueurIncompletRow>(
    `WITH matches_joues AS (
       SELECT "IDJOUEUR",
              SUM(COALESCE("TITULAIRETOTAL", 0) + COALESCE("REMPTOTAL", 0)) AS "MATCHES"
       FROM "JOUEUR"
       GROUP BY "IDJOUEUR"
     )
     SELECT
       jr."IDJOUEUR",
       jr."NOM",
       jr."PRENOM",
       jr."SURNOM",
       jr."IDNATIO",
       jr."NAISSANCE",
       COALESCE(jr."APPARITION", 0) AS "APPARITION",
       COALESCE(mj."MATCHES", 0) AS "MATCHES_CALCULES",
       CASE WHEN jr."PRENOM" IS NULL OR TRIM(jr."PRENOM") = '' THEN 1 ELSE 0 END AS "SANS_PRENOM",
       CASE WHEN jr."NAISSANCE" IS NULL OR TRIM(jr."NAISSANCE") = '' THEN 1 ELSE 0 END AS "SANS_NAISSANCE",
       CASE WHEN COALESCE(jr."IDVILLE", 0) = 0 THEN 1 ELSE 0 END AS "SANS_LIEU_NAISSANCE",
       CASE WHEN COALESCE(jr."HAUTEUR", 0) = 0 OR COALESCE(jr."POIDS", 0) = 0 THEN 1 ELSE 0 END AS "SANS_MENSURATIONS",
       CASE WHEN COALESCE(jr."APPARITION", 0) <> COALESCE(mj."MATCHES", 0) THEN 1 ELSE 0 END AS "MATCHES_INCOMPLETS",
       CASE WHEN jr."PHOTO" IS NULL OR LENGTH(jr."PHOTO") = 0 THEN 1 ELSE 0 END AS "SANS_PORTRAIT"
     FROM "JOUEURRG" jr
     LEFT JOIN matches_joues mj ON mj."IDJOUEUR" = jr."IDJOUEUR"
     WHERE jr."PRENOM" IS NULL OR TRIM(jr."PRENOM") = ''
        OR jr."NAISSANCE" IS NULL OR TRIM(jr."NAISSANCE") = ''
        OR COALESCE(jr."IDVILLE", 0) = 0
        OR COALESCE(jr."HAUTEUR", 0) = 0
        OR COALESCE(jr."POIDS", 0) = 0
        OR COALESCE(jr."APPARITION", 0) <> COALESCE(mj."MATCHES", 0)
        OR jr."PHOTO" IS NULL OR LENGTH(jr."PHOTO") = 0
     ORDER BY jr."NOM" ASC, jr."PRENOM" ASC`,
  );
}

export interface ClubIncompletRow {
  IDCLUB: string;
  CLUB: string;
  IDNATIO: string | null;
  SANS_PAYS: number;
  SANS_VILLE: number;
  SANS_STADE: number;
  SANS_DATE_CREATION: number;
  SANS_LOGO: number;
}

const CLUB_SANS_PAYS_SQL = `(TRIM(COALESCE(c."IDNATIO", '')) = ''
  OR NOT EXISTS (SELECT 1 FROM "NATIO" n WHERE n."IDNATIO" = c."IDNATIO"))`;
const CLUB_SANS_VILLE_SQL = `(COALESCE(c."IDVILLE", 0) = 0
  OR NOT EXISTS (SELECT 1 FROM "VILLE" v WHERE v."VICLEUNIK" = c."IDVILLE"))`;
const CLUB_SANS_STADE_SQL = `NOT EXISTS (
  SELECT 1 FROM "CLUB_TERRAIN" ct WHERE ct."IDCLUB" = c."IDCLUB" AND COALESCE(ct."TECLEUNIK", 0) > 0)`;
// La date de création est portee par l'evenement CLUB_NOM de type 1 (création).
const CLUB_SANS_DATE_CREATION_SQL = `NOT EXISTS (
  SELECT 1 FROM "CLUB_NOM" cn
  WHERE cn."IDCLUB" = c."IDCLUB" AND COALESCE(cn."CN_ACTION", 0) = 1 AND TRIM(COALESCE(cn."DATE", '')) <> '')`;
const CLUB_SANS_LOGO_SQL = `(c."ECUSSON" IS NULL OR LENGTH(c."ECUSSON") = 0)`;

export async function getClubsIncomplets(): Promise<ClubIncompletRow[]> {
  return dbAll<ClubIncompletRow>(
    `SELECT
       c."IDCLUB",
       c."CLUB",
       c."IDNATIO",
       CASE WHEN ${CLUB_SANS_PAYS_SQL} THEN 1 ELSE 0 END AS "SANS_PAYS",
       CASE WHEN ${CLUB_SANS_VILLE_SQL} THEN 1 ELSE 0 END AS "SANS_VILLE",
       CASE WHEN ${CLUB_SANS_STADE_SQL} THEN 1 ELSE 0 END AS "SANS_STADE",
       CASE WHEN ${CLUB_SANS_DATE_CREATION_SQL} THEN 1 ELSE 0 END AS "SANS_DATE_CREATION",
       CASE WHEN ${CLUB_SANS_LOGO_SQL} THEN 1 ELSE 0 END AS "SANS_LOGO"
     FROM "CLUB" c
     WHERE ${CLUB_SANS_PAYS_SQL}
        OR ${CLUB_SANS_VILLE_SQL}
        OR ${CLUB_SANS_STADE_SQL}
        OR ${CLUB_SANS_DATE_CREATION_SQL}
        OR ${CLUB_SANS_LOGO_SQL}
     ORDER BY c."CLUB" ASC`,
  );
}

export interface RencontreIncompleteRow {
  ROW_KEY: string;
  RECLEUNIK: number | null;
  MACLEUNIK: number | null;
  DATE: string | null;
  SAISON: string | null;
  ETAT: number | null;
  DOMICILE: string | null;
  EXTERIEUR: string | null;
  DOMICILE_NOM: string | null;
  EXTERIEUR_NOM: string | null;
  BUTDOM: number | null;
  BUTEXT: number | null;
  COMPET_NOM: string | null;
  SANS_ARBITRE: number;
  SANS_TERRAIN: number;
  SANS_ENTRAINEUR: number;
  EFFECTIF_KO: number;
  SCORE_INCONNU: number;
  SPECTATEURS_INCONNUS: number;
  BUTEURS_INCONNUS: number;
  BUTEURS_CLUB_INCONNUS: number;
  MINUTES_BUTS_INCONNUES: number;
  REMPLACEMENTS_INCOMPLETS: number;
  CLUBS_INCOHERENTS: number;
  DESYNCHRO: number;
}

const RENCONTRE_INCOMPLETE_FLAGS = [
  'SANS_ARBITRE',
  'SANS_TERRAIN',
  'SANS_ENTRAINEUR',
  'EFFECTIF_KO',
  'SCORE_INCONNU',
  'SPECTATEURS_INCONNUS',
  'BUTEURS_INCONNUS',
  'BUTEURS_CLUB_INCONNUS',
  'MINUTES_BUTS_INCONNUES',
  'REMPLACEMENTS_INCOMPLETS',
  'CLUBS_INCOHERENTS',
  'DESYNCHRO',
] as const;

const COMPO_STARTER_FIELDS = [
  'GOAL', 'DLG', 'DLD', 'DCG', 'DCD', 'LIB', 'STO',
  'MDLD', 'MDLG', 'MDCD', 'MDCG', 'MOLD', 'MOLG', 'MOCD', 'MOCG', 'MOCC', 'MDCC',
  'ALD', 'ALG', 'ACD', 'ACG', 'AVC',
] as const;
const COMPO_SUB_FIELDS = Array.from({ length: 11 }, (_, index) => `REMP${index + 1}`);
const STARTERS_EXPECTED = 11;

/** But marque en cours de jeu: TYPE_EVENT=1, ou penalty transforme (7) hors seance de tirs au but (PERIODE=5). */
const GOAL_EVENT_PREDICATE = `(ev."TYPE_EVENT" = 1 OR (ev."TYPE_EVENT" = 7 AND COALESCE(ev."PERIODE", 0) <> 5))`;

/** Un match "joue" (ETAT=3) est le seul sur lequel les criteres de contenu ont du sens. */
const PLAYED_SQL = `COALESCE(r."ETAT", 0) = 3`;

async function getCompoIssuesByMatch(): Promise<Map<number, boolean>> {
  const compoCols = [...COMPO_STARTER_FIELDS, ...COMPO_SUB_FIELDS];
  const rows = await dbAll<Record<string, unknown>>(
    `SELECT e."MACLEUNIK", ${compoCols.map((col) => `e."${col}"`).join(', ')} FROM "EQUIPE" e`,
  );

  const issues = new Map<number, boolean>();
  rows.forEach((row) => {
    const macleunik = Number(row.MACLEUNIK ?? 0);
    if (!macleunik) return;

    const starters = COMPO_STARTER_FIELDS
      .map((field) => String(row[field] ?? '').trim())
      .filter(Boolean);
    const allPlayers = [...starters, ...COMPO_SUB_FIELDS
      .map((field) => String(row[field] ?? '').trim())
      .filter(Boolean)];

    const hasDuplicate = new Set(allPlayers).size !== allPlayers.length;
    issues.set(macleunik, starters.length !== STARTERS_EXPECTED || hasDuplicate);
  });
  return issues;
}

/** Outils > Fiches incompletes : matchs du club supporte (amicaux inclus) presentant au moins une anomalie. */
export async function getRencontresIncompletes(): Promise<RencontreIncompleteRow[]> {
  const supportedClubId = getSupportedClubIdFromEnv();

  const rows = await dbAll<RencontreIncompleteRow>(
    `SELECT
       'M' || m."MACLEUNIK" AS "ROW_KEY",
       r."RECLEUNIK",
       m."MACLEUNIK",
       r."DATE",
       r."SAISON" AS "SAISON",
       r."ETAT",
       r."DOMICILE",
       r."EXTERIEUR",
       COALESCE(cd."CLUB", r."DOMICILE") AS "DOMICILE_NOM",
       COALESCE(ce."CLUB", r."EXTERIEUR") AS "EXTERIEUR_NOM",
       r."BUTDOM",
       r."BUTEXT",
       co."NOM" AS "COMPET_NOM",
       CASE WHEN ${PLAYED_SQL} AND (
         TRIM(COALESCE(m."IDARBITRE", '')) = ''
         OR NOT EXISTS (SELECT 1 FROM "ARBITRE" a WHERE a."IDARBITRE" = m."IDARBITRE")
       ) THEN 1 ELSE 0 END AS "SANS_ARBITRE",
       CASE WHEN ${PLAYED_SQL} AND (
         COALESCE(m."TECLEUNIK", 0) = 0
         OR NOT EXISTS (SELECT 1 FROM "TERRAIN" t WHERE t."TECLEUNIK" = m."TECLEUNIK")
       ) THEN 1 ELSE 0 END AS "SANS_TERRAIN",
       CASE WHEN ${PLAYED_SQL} AND NOT EXISTS (
         SELECT 1 FROM "EQUIPE" e
         WHERE e."MACLEUNIK" = m."MACLEUNIK" AND TRIM(COALESCE(e."ENTRAINEUR", '')) <> ''
       ) THEN 1 ELSE 0 END AS "SANS_ENTRAINEUR",
       CASE WHEN COALESCE(r."ETAT", 0) = 1
         AND TRIM(COALESCE(r."DATE", '')) <> ''
         AND r."DATE" < DATE('now')
       THEN 1 ELSE 0 END AS "SCORE_INCONNU",
       CASE WHEN ${PLAYED_SQL} AND COALESCE(m."NBSPECT", 0) = 0 THEN 1 ELSE 0 END AS "SPECTATEURS_INCONNUS",
       CASE WHEN ${PLAYED_SQL} AND (
         SELECT COUNT(*) FROM "EVENT" ev
         WHERE ev."MACLEUNIK" = m."MACLEUNIK" AND ${GOAL_EVENT_PREDICATE}
       ) <> COALESCE(r."BUTDOM", 0) + COALESCE(r."BUTEXT", 0) THEN 1 ELSE 0 END AS "BUTEURS_INCONNUS",
       CASE WHEN ${PLAYED_SQL} AND (
         SELECT COUNT(*) FROM "EVENT" ev
         WHERE ev."MACLEUNIK" = m."MACLEUNIK" AND COALESCE(ev."ADVERSAIRE", 0) = 0 AND ${GOAL_EVENT_PREDICATE}
       ) <> (CASE WHEN r."DOMICILE" = ? THEN COALESCE(r."BUTDOM", 0) ELSE COALESCE(r."BUTEXT", 0) END)
       THEN 1 ELSE 0 END AS "BUTEURS_CLUB_INCONNUS",
       CASE WHEN ${PLAYED_SQL} AND EXISTS (
         SELECT 1 FROM "EVENT" ev
         WHERE ev."MACLEUNIK" = m."MACLEUNIK" AND ${GOAL_EVENT_PREDICATE} AND COALESCE(ev."MINUTE", 0) <= 0
       ) THEN 1 ELSE 0 END AS "MINUTES_BUTS_INCONNUES",
       CASE WHEN ${PLAYED_SQL} AND EXISTS (
         SELECT 1 FROM "EVENT" ev
         WHERE ev."MACLEUNIK" = m."MACLEUNIK"
           AND ev."TYPE_EVENT" = 2
           AND COALESCE(ev."ADVERSAIRE", 0) = 0
           AND (TRIM(COALESCE(ev."JOUEUR1", '')) = ''
             OR TRIM(COALESCE(ev."JOUEUR2", '')) = ''
             OR COALESCE(ev."MINUTE", 0) <= 0)
       ) THEN 1 ELSE 0 END AS "REMPLACEMENTS_INCOMPLETS",
       CASE WHEN TRIM(COALESCE(r."DATE", '')) <> '' AND EXISTS (
         SELECT 1 FROM "CLUB_NOM" cn
         WHERE cn."IDCLUB" IN (r."DOMICILE", r."EXTERIEUR")
           AND TRIM(COALESCE(cn."DATE", '')) <> ''
           AND ((COALESCE(cn."CN_ACTION", 0) = 1 AND cn."DATE" > r."DATE")
             OR (COALESCE(cn."CN_ACTION", 0) = 3 AND cn."DATE" < r."DATE"))
       ) THEN 1 ELSE 0 END AS "CLUBS_INCOHERENTS",
       CASE WHEN r."RECLEUNIK" IS NULL
         OR EXISTS (
           SELECT 1 FROM "EQUIPE" e
           WHERE e."MACLEUNIK" = m."MACLEUNIK"
             AND (TRIM(COALESCE(e."DATE", '')) <> TRIM(COALESCE(r."DATE", ''))
               OR TRIM(COALESCE(e."SAISON", '')) <> TRIM(COALESCE(r."SAISON", '')))
         )
       THEN 1 ELSE 0 END AS "DESYNCHRO"
     FROM "MATCH" m
     LEFT JOIN "RENCO" r ON r."RECLEUNIK" = m."RECLEUNIK"
     LEFT JOIN "CLUB" cd ON cd."IDCLUB" = r."DOMICILE"
     LEFT JOIN "CLUB" ce ON ce."IDCLUB" = r."EXTERIEUR"
     LEFT JOIN "TOUR" tu ON tu."TUCLEUNIK" = r."TUCLEUNIK"
     LEFT JOIN "COMPET" co ON co."COCLEUNIK" = tu."COCLEUNIK"

     UNION ALL

     SELECT
       'R' || r."RECLEUNIK" AS "ROW_KEY",
       r."RECLEUNIK",
       NULL AS "MACLEUNIK",
       r."DATE",
       r."SAISON",
       r."ETAT",
       r."DOMICILE",
       r."EXTERIEUR",
       COALESCE(cd."CLUB", r."DOMICILE") AS "DOMICILE_NOM",
       COALESCE(ce."CLUB", r."EXTERIEUR") AS "EXTERIEUR_NOM",
       r."BUTDOM",
       r."BUTEXT",
       co."NOM" AS "COMPET_NOM",
       0, 0, 0,
       CASE WHEN COALESCE(r."ETAT", 0) = 1 THEN 1 ELSE 0 END AS "SCORE_INCONNU",
       0, 0, 0, 0, 0, 0,
       CASE WHEN COALESCE(r."ETAT", 0) = 3 THEN 1 ELSE 0 END AS "DESYNCHRO"
     FROM "RENCO" r
     LEFT JOIN "CLUB" cd ON cd."IDCLUB" = r."DOMICILE"
     LEFT JOIN "CLUB" ce ON ce."IDCLUB" = r."EXTERIEUR"
     LEFT JOIN "TOUR" tu ON tu."TUCLEUNIK" = r."TUCLEUNIK"
     LEFT JOIN "COMPET" co ON co."COCLEUNIK" = tu."COCLEUNIK"
     WHERE (r."DOMICILE" = ? OR r."EXTERIEUR" = ?)
       AND NOT EXISTS (SELECT 1 FROM "MATCH" m WHERE m."RECLEUNIK" = r."RECLEUNIK")
       -- Une rencontre a venir n'a pas encore de fiche MATCH: seules les jouees (ou les passees restees En attente) sont anormales.
       AND (COALESCE(r."ETAT", 0) = 3
         OR (COALESCE(r."ETAT", 0) = 1 AND TRIM(COALESCE(r."DATE", '')) <> '' AND r."DATE" < DATE('now')))

     ORDER BY "DATE" DESC`,
    [supportedClubId, supportedClubId, supportedClubId],
  );

  // L'effectif (11 titulaires, aucun joueur en double) se verifie plus lisiblement hors SQL.
  const compoIssues = await getCompoIssuesByMatch();
  return rows
    .map((row) => ({
      ...row,
      EFFECTIF_KO: Number(row.ETAT) === 3 && row.MACLEUNIK != null
        ? Number(compoIssues.get(Number(row.MACLEUNIK)) ?? true)
        : 0,
    }))
    .filter((row) => RENCONTRE_INCOMPLETE_FLAGS.some((flag) => Number(row[flag]) === 1));
}

export default { getJoueursIncomplets, getClubsIncomplets, getRencontresIncompletes };
