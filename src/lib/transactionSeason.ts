import db from '../config/database';
import { AppError } from '../types';
import { officialMatchSql } from './supportedMatches';
import { getSupportedClubIdFromEnv } from './supportedClub';

/**
 * "Saison des mouvements" d'une transaction (TRANSAC.SAISON), deduite du calendrier du club supporte :
 * - borne(S) = date du dernier match OFFICIEL du club supporte de la saison S, joue ou programme
 *   (ETAT <> 4 : les matchs non joues/annules sont ignores), DATE non vide ; a defaut SAISON.SA_FIN de S.
 * - une transaction datee D appartient a S quand borne(S-1) < D <= borne(S) (saisons ordonnees par
 *   SA_DEBUT puis SAISON ; pas de borne basse pour la premiere saison).
 *
 * CTE `season_bounds` : une ligne par saison (SAISON, SA_DEBUT, BORNE, PREV_BORNE, PREV2_BORNE, NEXT_BORNE).
 * Parametres a lier, dans l'ordre : club supporte x2.
 */
const SEASON_BOUNDS_CTE = `
  match_bounds AS (
    SELECT r.SAISON, MAX(r.DATE) AS BORNE
    FROM RENCO r
    WHERE (r.DOMICILE = ? OR r.EXTERIEUR = ?)
      AND r.ETAT <> 4
      AND r.DATE <> ''
      AND ${officialMatchSql('r')}
    GROUP BY r.SAISON
  ),
  season_bounds AS (
    SELECT
      s.SAISON,
      s.SA_DEBUT,
      COALESCE(mb.BORNE, s.SA_FIN) AS BORNE,
      LAG(COALESCE(mb.BORNE, s.SA_FIN)) OVER w AS PREV_BORNE,
      LAG(COALESCE(mb.BORNE, s.SA_FIN), 2) OVER w AS PREV2_BORNE,
      LEAD(COALESCE(mb.BORNE, s.SA_FIN)) OVER w AS NEXT_BORNE
    FROM SAISON s
    LEFT JOIN match_bounds mb ON mb.SAISON = s.SAISON
    WINDOW w AS (ORDER BY s.SA_DEBUT, s.SAISON)
  )`;

/** Saison couvrant la date `dateSql` (expression SQL), ou NULL si aucune. */
function seasonForDateSql(dateSql: string): string {
  return `(SELECT sb.SAISON FROM season_bounds sb
           WHERE (sb.PREV_BORNE IS NULL OR ${dateSql} > sb.PREV_BORNE) AND ${dateSql} <= sb.BORNE
           ORDER BY sb.SA_DEBUT, sb.SAISON
           LIMIT 1)`;
}

export interface SeasonBoundary {
  SAISON: string;
  BORNE: string;
  PREV_BORNE: string | null;
}

function supportedClubParams(): [string, string] {
  const clubId = getSupportedClubIdFromEnv();
  return [clubId, clubId];
}

/** Bornes de toutes les saisons, dans l'ordre chronologique. */
export function getTransactionSeasonBoundaries(): SeasonBoundary[] {
  return db.prepare(
    `WITH ${SEASON_BOUNDS_CTE}
     SELECT SAISON, BORNE, PREV_BORNE FROM season_bounds ORDER BY SA_DEBUT, SAISON`,
  ).all(...supportedClubParams()) as SeasonBoundary[];
}

/** Saison des mouvements d'une date ISO "YYYY-MM-DD" deja validee ; 422 si aucune saison ne la couvre. */
export function resolveTransactionSeason(date: string): string {
  // seasonForDateSql('?') references the date twice: it is bound twice.
  const row = db.prepare(`WITH ${SEASON_BOUNDS_CTE} SELECT ${seasonForDateSql('?')} AS SAISON`)
    .get(...supportedClubParams(), date, date) as { SAISON: string | null } | undefined;
  if (!row?.SAISON) {
    throw new AppError(422, `Aucune saison ne couvre la date ${date} (postérieure à la borne de la dernière saison).`);
  }
  return row.SAISON;
}

/**
 * Reaffecte TRANSAC.SAISON selon la regle pour les transactions rattachees a `season` ou datees dans
 * ]borne(S-2), borne(S+1)] (absorbe tout deplacement de borne de S). Les transactions qu'aucune saison
 * ne couvre restent inchangees. Retourne le nombre de lignes modifiees.
 */
export function reassignTransactionSeasonsAround(season: string): number {
  const result = db.prepare(
    `WITH ${SEASON_BOUNDS_CTE},
     scope AS (SELECT PREV2_BORNE, NEXT_BORNE FROM season_bounds WHERE SAISON = ?),
     target AS (
       SELECT t.TNCLEUNIK, ${seasonForDateSql('t.DATE')} AS NEW_SAISON
       FROM TRANSAC t
       WHERE t.SAISON = ?
          OR EXISTS (
            SELECT 1 FROM scope sc
            WHERE (sc.PREV2_BORNE IS NULL OR t.DATE > sc.PREV2_BORNE)
              AND (sc.NEXT_BORNE IS NULL OR t.DATE <= sc.NEXT_BORNE)
          )
     )
     UPDATE TRANSAC
     SET SAISON = target.NEW_SAISON
     FROM target
     WHERE TRANSAC.TNCLEUNIK = target.TNCLEUNIK
       AND target.NEW_SAISON IS NOT NULL
       AND TRANSAC.SAISON <> target.NEW_SAISON`,
  ).run(...supportedClubParams(), season, season);
  return Number(result.changes ?? 0);
}
