import { dbAll } from '../../../config/database';
import { scopeFilterClause, scopeFilterJoins } from '../../../lib/matchScopeFilter';
import { getSupportedClubIdFromEnv } from '../../../lib/supportedClub';
import { joueurPresentSql } from './joueurPresent';

/** JOUEUR/JOUEURRG: cumul TITULAIRETOTAL + REMPTOTAL de toutes les saisons, trie decroissant. */
export interface PlusSelectionneRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  APPARITIONS: number;
}

export async function getPlusSelectionnes(): Promise<PlusSelectionneRow[]> {
  return dbAll<PlusSelectionneRow>(
    `SELECT
      jr.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      SUM(COALESCE(j.TITULAIRETOTAL, 0) + COALESCE(j.REMPTOTAL, 0)) AS APPARITIONS
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
     INNER JOIN Poste p ON p.POS_ID = j.POSTE AND p.POS_TYPE = 1
     GROUP BY jr.IDJOUEUR, jr.NOM, jr.PRENOM, jr.SURNOM, jr.IDNATIO
     HAVING APPARITIONS > 0
     ORDER BY APPARITIONS DESC, jr.NOM ASC, jr.PRENOM ASC`,
  );
}

/** Meme cumul que ci-dessus mais sans agreger les saisons: 1 ligne par joueur/saison. */
export interface ParSaisonRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  SAISON: string;
  APPARITIONS: number;
}

export async function getParSaison(): Promise<ParSaisonRow[]> {
  return dbAll<ParSaisonRow>(
    `SELECT
      jr.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      j.SAISON,
      SUM(COALESCE(j.TITULAIRETOTAL, 0) + COALESCE(j.REMPTOTAL, 0)) AS APPARITIONS
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
     INNER JOIN Poste p ON p.POS_ID = j.POSTE AND p.POS_TYPE = 1
     GROUP BY jr.IDJOUEUR, jr.NOM, jr.PRENOM, jr.SURNOM, jr.IDNATIO, j.SAISON
     HAVING APPARITIONS > 0
     ORDER BY APPARITIONS DESC, j.SAISON DESC, jr.NOM ASC`,
  );
}

export interface ButeurRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  BUTS: number;
  EN_CLUB: number;
}

type ScoringMetric = 'buts' | 'passes';

function scoringColumns(metric: ScoringMetric): { season: string; eventPlayer: string } {
  return metric === 'passes'
    ? { season: 'j.PASSETOTAL', eventPlayer: 'e.JOUEUR2' }
    : { season: 'j.BUTTOTAL', eventPlayer: 'e.JOUEUR1' };
}

export async function getButeurs(metric: ScoringMetric = 'buts'): Promise<ButeurRow[]> {
  const { season } = scoringColumns(metric);
  return dbAll<ButeurRow>(
    `SELECT
      jr.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      SUM(COALESCE(${season}, 0)) AS BUTS,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
     INNER JOIN Poste p ON p.POS_ID = j.POSTE AND p.POS_TYPE = 1
     GROUP BY jr.IDJOUEUR, jr.NOM, jr.PRENOM, jr.SURNOM, jr.IDNATIO
     HAVING BUTS > 0
     ORDER BY BUTS DESC, jr.NOM ASC, jr.PRENOM ASC`,
  );
}

export interface ButeurSaisonRow extends ButeurRow {
  SAISON: string;
}

export async function getButeursParSaison(metric: ScoringMetric = 'buts'): Promise<ButeurSaisonRow[]> {
  const { season } = scoringColumns(metric);
  return dbAll<ButeurSaisonRow>(
    `SELECT
      jr.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      j.SAISON,
      SUM(COALESCE(${season}, 0)) AS BUTS,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
     INNER JOIN Poste p ON p.POS_ID = j.POSTE AND p.POS_TYPE = 1
     GROUP BY jr.IDJOUEUR, jr.NOM, jr.PRENOM, jr.SURNOM, jr.IDNATIO, j.SAISON
     HAVING BUTS > 0
     ORDER BY BUTS DESC, j.SAISON DESC, jr.NOM ASC, jr.PRENOM ASC`,
  );
}

export interface EfficaciteButeurRow extends ButeurRow {
  MATCHES: number;
  MINUTES: number;
  MINUTES_PAR_BUT: number;
}

export async function getEfficaciteButeurs(metric: ScoringMetric = 'buts'): Promise<EfficaciteButeurRow[]> {
  const { season } = scoringColumns(metric);
  return dbAll<EfficaciteButeurRow>(
    `SELECT
      jr.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      SUM(COALESCE(${season}, 0)) AS BUTS,
      SUM(COALESCE(j.TITULAIRETOTAL, 0) + COALESCE(j.REMPTOTAL, 0)) AS MATCHES,
      SUM(COALESCE(j.TEMPSTOTAL, 0)) AS MINUTES,
      ROUND(CAST(SUM(COALESCE(j.TEMPSTOTAL, 0)) AS REAL) / SUM(COALESCE(${season}, 0))) AS MINUTES_PAR_BUT,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
     INNER JOIN Poste p ON p.POS_ID = j.POSTE AND p.POS_TYPE = 1
     GROUP BY jr.IDJOUEUR, jr.NOM, jr.PRENOM, jr.SURNOM, jr.IDNATIO
     HAVING BUTS > 2 AND MATCHES > 10
     ORDER BY MINUTES_PAR_BUT ASC, BUTS DESC, jr.NOM ASC, jr.PRENOM ASC`,
  );
}

type SanctionMetric = 'avertissements' | 'exclusions';

function sanctionColumns(metric: SanctionMetric): string {
  return metric === 'exclusions' ? 'j.ROUGETOTAL' : 'j.JAUNETOTAL';
}

export async function getSanctions(metric: SanctionMetric = 'avertissements'): Promise<ButeurRow[]> {
  const season = sanctionColumns(metric);
  return dbAll<ButeurRow>(
    `SELECT jr.IDJOUEUR, jr.NOM, jr.PRENOM, jr.SURNOM, jr.IDNATIO,
      SUM(COALESCE(${season}, 0)) AS BUTS,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
     INNER JOIN Poste p ON p.POS_ID = j.POSTE AND p.POS_TYPE = 1
     GROUP BY jr.IDJOUEUR, jr.NOM, jr.PRENOM, jr.SURNOM, jr.IDNATIO
     HAVING BUTS > 0
     ORDER BY BUTS DESC, jr.NOM ASC, jr.PRENOM ASC`,
  );
}

export async function getSanctionsParSaison(metric: SanctionMetric = 'avertissements'): Promise<ButeurSaisonRow[]> {
  const season = sanctionColumns(metric);
  return dbAll<ButeurSaisonRow>(
    `SELECT jr.IDJOUEUR, jr.NOM, jr.PRENOM, jr.SURNOM, jr.IDNATIO,
      j.SAISON,
      SUM(COALESCE(${season}, 0)) AS BUTS,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
     INNER JOIN Poste p ON p.POS_ID = j.POSTE AND p.POS_TYPE = 1
     GROUP BY jr.IDJOUEUR, jr.NOM, jr.PRENOM, jr.SURNOM, jr.IDNATIO, j.SAISON
     HAVING BUTS > 0
     ORDER BY BUTS DESC, j.SAISON DESC, jr.NOM ASC, jr.PRENOM ASC`,
  );
}

export interface ExclusionRapideRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  MINUTE: number;
  MATCH_DATE: string;
  RECLEUNIK: number;
  EN_CLUB: number;
}

export async function getExclusionsRapides(scope?: number | null): Promise<ExclusionRapideRow[]> {
  return dbAll<ExclusionRapideRow>(
    `WITH fastest_exclusions AS (
      SELECT
        e.JOUEUR1 AS IDJOUEUR,
        e.MINUTE,
        re.DATE AS MATCH_DATE,
        re.RECLEUNIK,
        ROW_NUMBER() OVER (
          PARTITION BY e.JOUEUR1
          ORDER BY e.MINUTE ASC, re.DATE ASC, re.RECLEUNIK ASC
        ) AS rn
      FROM EVENT e
      INNER JOIN MATCH m ON m.MACLEUNIK = e.MACLEUNIK
      INNER JOIN RENCO re ON re.RECLEUNIK = m.RECLEUNIK
      ${scopeFilterJoins('re')}
      WHERE e.TYPE_EVENT = 5
        AND e.ADVERSAIRE = 0
        AND e.JOUEUR1 IS NOT NULL
        AND TRIM(e.JOUEUR1) <> ''
        AND e.MINUTE < 45
        AND re.TUCLEUNIK <> 0
        ${scopeFilterClause(scope)}
    )
    SELECT
      jr.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      fe.MINUTE,
      fe.MATCH_DATE,
      fe.RECLEUNIK,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
    FROM fastest_exclusions fe
    INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = fe.IDJOUEUR
    WHERE fe.rn = 1
    ORDER BY fe.MINUTE ASC, jr.NOM ASC, jr.PRENOM ASC`,
    scope != null ? [scope] : [],
  );
}

export interface GardienRow extends ButeurRow {
  BUTS_ENCAISSES: number;
  MINUTES: number;
  MINUTES_PAR_BUT_ENCAISSE: number;
}

export async function getMeilleursGardiens(scope?: number | null): Promise<GardienRow[]> {
  const supportedClubId = getSupportedClubIdFromEnv();
  return dbAll<GardienRow>(
    `WITH official_matches AS (
      SELECT m.MACLEUNIK, re.DOMICILE, re.BUTDOM, re.BUTEXT
      FROM MATCH m
      INNER JOIN RENCO re ON re.RECLEUNIK = m.RECLEUNIK
      ${scopeFilterJoins('re')}
      WHERE re.TUCLEUNIK <> 0
        ${scopeFilterClause(scope)}
    ),
    goalkeeper_match_players AS (
      SELECT e.GOAL AS IDJOUEUR, e.MACLEUNIK, 1 AS IS_STARTER
      FROM EQUIPE e
      INNER JOIN official_matches om ON om.MACLEUNIK = e.MACLEUNIK
      WHERE e.GOAL IS NOT NULL AND TRIM(e.GOAL) <> ''
      UNION
      SELECT ev.JOUEUR2 AS IDJOUEUR, ev.MACLEUNIK, 0 AS IS_STARTER
      FROM EVENT ev
      INNER JOIN official_matches om ON om.MACLEUNIK = ev.MACLEUNIK
      WHERE ev.TYPE_EVENT = 2 AND ev.JOUEUR2 IS NOT NULL AND TRIM(ev.JOUEUR2) <> ''
    ),
    goalkeeper_match_goals AS (
      SELECT
        gp.IDJOUEUR,
        gp.MACLEUNIK,
        CASE
          WHEN gp.IS_STARTER = 1
            AND NOT EXISTS (
              SELECT 1 FROM EVENT sortie_complete
              WHERE sortie_complete.MACLEUNIK = gp.MACLEUNIK
                AND sortie_complete.TYPE_EVENT = 2
                AND sortie_complete.JOUEUR1 = gp.IDJOUEUR
            )

          THEN CASE WHEN om.DOMICILE = ? THEN om.BUTEXT ELSE om.BUTDOM END
          ELSE SUM(CASE WHEN ev.TYPE_EVENT = 1 AND ev.ADVERSAIRE = 1 THEN 1 ELSE 0 END)
        END AS BUTS_ENCAISSES
      FROM goalkeeper_match_players gp
      INNER JOIN official_matches om ON om.MACLEUNIK = gp.MACLEUNIK
      LEFT JOIN EVENT ev ON ev.MACLEUNIK = gp.MACLEUNIK
        AND ev.TYPE_EVENT = 1
        AND ev.ADVERSAIRE = 1
        AND (
          (
            ev.MINUTE >= 0
            AND EXISTS (
              SELECT 1 FROM EQUIPE starter
              WHERE starter.MACLEUNIK = gp.MACLEUNIK AND starter.GOAL = gp.IDJOUEUR
            )
            AND NOT EXISTS (
              SELECT 1 FROM EVENT sortie
              WHERE sortie.MACLEUNIK = gp.MACLEUNIK
                AND sortie.TYPE_EVENT = 2
                AND sortie.JOUEUR1 = gp.IDJOUEUR
                AND sortie.MINUTE <= ev.MINUTE
            )
          )
          OR EXISTS (
            SELECT 1 FROM EVENT entree
            WHERE entree.MACLEUNIK = gp.MACLEUNIK
              AND entree.TYPE_EVENT = 2
              AND entree.JOUEUR2 = gp.IDJOUEUR
              AND entree.MINUTE <= ev.MINUTE
              AND NOT EXISTS (
                SELECT 1 FROM EVENT sortie_apres_entree
                WHERE sortie_apres_entree.MACLEUNIK = gp.MACLEUNIK
                  AND sortie_apres_entree.TYPE_EVENT = 2
                  AND sortie_apres_entree.JOUEUR1 = gp.IDJOUEUR
                  AND sortie_apres_entree.MINUTE > entree.MINUTE
                  AND sortie_apres_entree.MINUTE <= ev.MINUTE
              )
          )
        )
      GROUP BY gp.IDJOUEUR, gp.MACLEUNIK, gp.IS_STARTER, om.DOMICILE, om.BUTDOM, om.BUTEXT
    ),
    goalkeeper_totals AS (
      SELECT
        minutes.IDJOUEUR,
        minutes.MINUTES,
        minutes.MATCHES,
        COALESCE(conceded.BUTS_ENCAISSES, 0) AS BUTS_ENCAISSES
      FROM (
        SELECT
          j.IDJOUEUR,
          SUM(COALESCE(j.TEMPSTOTAL, 0)) AS MINUTES,
          SUM(COALESCE(j.TITULAIRETOTAL, 0) + COALESCE(j.REMPTOTAL, 0)) AS MATCHES
        FROM JOUEUR j
        INNER JOIN Poste p ON p.POS_ID = j.POSTE AND p.POS_ID = 1
        GROUP BY j.IDJOUEUR
      ) minutes
      LEFT JOIN (
        SELECT IDJOUEUR, SUM(BUTS_ENCAISSES) AS BUTS_ENCAISSES
        FROM goalkeeper_match_goals
        GROUP BY IDJOUEUR
      ) conceded ON conceded.IDJOUEUR = minutes.IDJOUEUR
    )
    SELECT
      jr.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      gt.BUTS_ENCAISSES,
      gt.MINUTES,
      ROUND(CAST(gt.MINUTES AS REAL) / NULLIF(gt.BUTS_ENCAISSES, 0)) AS MINUTES_PAR_BUT_ENCAISSE,
      gt.BUTS_ENCAISSES AS BUTS,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
    FROM goalkeeper_totals gt
    INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = gt.IDJOUEUR
    WHERE gt.MINUTES > 0 AND gt.MATCHES > 10
    ORDER BY MINUTES_PAR_BUT_ENCAISSE DESC, jr.NOM ASC, jr.PRENOM ASC`,
    scope != null ? [scope, supportedClubId] : [supportedClubId],
  );
}

export interface SerieInviolabiliteRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  SERIE: number;
  SERIE_DEBUT: string;
  SERIE_FIN: string;
  EN_COURS: number;
  EN_CLUB: number;
}

export async function getSeriesInviolabilite(scope?: number | null): Promise<SerieInviolabiliteRow[]> {
  const supportedClubId = getSupportedClubIdFromEnv();
  return dbAll<SerieInviolabiliteRow>(
    `WITH official_matches AS (
      SELECT m.MACLEUNIK, re.DATE, re.DOMICILE, re.BUTDOM, re.BUTEXT
      FROM MATCH m INNER JOIN RENCO re ON re.RECLEUNIK = m.RECLEUNIK
      ${scopeFilterJoins('re')}
      WHERE re.TUCLEUNIK <> 0
        ${scopeFilterClause(scope)}
    ),
    goalkeeper_match_players AS (
      SELECT e.GOAL AS IDJOUEUR, e.MACLEUNIK, 1 AS IS_STARTER
      FROM EQUIPE e INNER JOIN official_matches om ON om.MACLEUNIK = e.MACLEUNIK
      WHERE e.GOAL IS NOT NULL AND TRIM(e.GOAL) <> ''
      UNION
      SELECT ev.JOUEUR2, ev.MACLEUNIK, 0
      FROM EVENT ev INNER JOIN official_matches om ON om.MACLEUNIK = ev.MACLEUNIK
      WHERE ev.TYPE_EVENT = 2 AND ev.JOUEUR2 IS NOT NULL AND TRIM(ev.JOUEUR2) <> ''
        AND EXISTS (
          SELECT 1 FROM JOUEUR jg
          INNER JOIN Poste pg ON pg.POS_ID = jg.POSTE AND pg.POS_ID = 1
          WHERE jg.IDJOUEUR = ev.JOUEUR2
        )
    ),
    goalkeeper_match_results AS (
      SELECT gp.IDJOUEUR, gp.MACLEUNIK, om.DATE,
        CASE WHEN gp.IS_STARTER = 1 AND NOT EXISTS (
          SELECT 1 FROM EVENT s WHERE s.MACLEUNIK = gp.MACLEUNIK AND s.TYPE_EVENT = 2 AND s.JOUEUR1 = gp.IDJOUEUR
        ) THEN CASE WHEN om.DOMICILE = ? THEN om.BUTEXT ELSE om.BUTDOM END
        ELSE SUM(CASE WHEN ev.TYPE_EVENT = 1 AND ev.ADVERSAIRE = 1 THEN 1 ELSE 0 END) END AS BUTS_ENCAISSES
      FROM goalkeeper_match_players gp
      INNER JOIN official_matches om ON om.MACLEUNIK = gp.MACLEUNIK
      LEFT JOIN EVENT ev ON ev.MACLEUNIK = gp.MACLEUNIK AND ev.TYPE_EVENT = 1 AND ev.ADVERSAIRE = 1
        AND (
          (EXISTS (SELECT 1 FROM EQUIPE st WHERE st.MACLEUNIK = gp.MACLEUNIK AND st.GOAL = gp.IDJOUEUR)
           AND NOT EXISTS (SELECT 1 FROM EVENT s WHERE s.MACLEUNIK = gp.MACLEUNIK AND s.TYPE_EVENT = 2 AND s.JOUEUR1 = gp.IDJOUEUR AND s.MINUTE <= ev.MINUTE))
          OR EXISTS (SELECT 1 FROM EVENT en WHERE en.MACLEUNIK = gp.MACLEUNIK AND en.TYPE_EVENT = 2 AND en.JOUEUR2 = gp.IDJOUEUR AND en.MINUTE <= ev.MINUTE
            AND NOT EXISTS (SELECT 1 FROM EVENT s2 WHERE s2.MACLEUNIK = gp.MACLEUNIK AND s2.TYPE_EVENT = 2 AND s2.JOUEUR1 = gp.IDJOUEUR AND s2.MINUTE > en.MINUTE AND s2.MINUTE <= ev.MINUTE))
        )
      GROUP BY gp.IDJOUEUR, gp.MACLEUNIK, gp.IS_STARTER, om.DATE, om.DOMICILE, om.BUTDOM, om.BUTEXT
    ),
    clean_groups AS (
      SELECT *, SUM(CASE WHEN BUTS_ENCAISSES > 0 THEN 1 ELSE 0 END) OVER (PARTITION BY IDJOUEUR ORDER BY DATE, MACLEUNIK ROWS UNBOUNDED PRECEDING) AS group_id
      FROM goalkeeper_match_results
    ),
    streaks AS (
      SELECT IDJOUEUR, group_id, COUNT(*) AS SERIE, MIN(DATE) AS SERIE_DEBUT, MAX(DATE) AS SERIE_FIN
      FROM clean_groups WHERE BUTS_ENCAISSES = 0 GROUP BY IDJOUEUR, group_id
    ),
    ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY IDJOUEUR ORDER BY SERIE DESC, SERIE_FIN DESC, SERIE_DEBUT DESC) AS rn
      FROM streaks
    ),
    last_played AS (SELECT IDJOUEUR, MAX(DATE) AS LAST_DATE FROM goalkeeper_match_results GROUP BY IDJOUEUR)
    SELECT jr.IDJOUEUR, jr.NOM, jr.PRENOM, jr.SURNOM, jr.IDNATIO,
      r.SERIE, r.SERIE_DEBUT, r.SERIE_FIN,
      CASE WHEN r.SERIE_FIN = lp.LAST_DATE THEN 1 ELSE 0 END AS EN_COURS,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
    FROM ranked r INNER JOIN last_played lp ON lp.IDJOUEUR = r.IDJOUEUR
    INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = r.IDJOUEUR
    WHERE r.rn = 1 AND r.SERIE > 1
    ORDER BY r.SERIE DESC, jr.NOM ASC, jr.PRENOM ASC`,
    scope != null ? [scope, supportedClubId] : [supportedClubId],
  );
}

export interface SerieButeurRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  SERIE: number;
  SERIE_DEBUT: string;
  SERIE_FIN: string;
  EN_COURS: number;
  EN_CLUB: number;
}

export async function getSeriesButeurs(metric: ScoringMetric = 'buts', scope?: number | null): Promise<SerieButeurRow[]> {
  const { eventPlayer } = scoringColumns(metric);
  return dbAll<SerieButeurRow>(
    `WITH player_matches AS (
      SELECT GOAL AS IDJOUEUR, MACLEUNIK FROM EQUIPE WHERE GOAL IS NOT NULL AND TRIM(GOAL) <> ''
      UNION ALL SELECT DLG, MACLEUNIK FROM EQUIPE WHERE DLG IS NOT NULL AND TRIM(DLG) <> ''
      UNION ALL SELECT DLD, MACLEUNIK FROM EQUIPE WHERE DLD IS NOT NULL AND TRIM(DLD) <> ''
      UNION ALL SELECT DCG, MACLEUNIK FROM EQUIPE WHERE DCG IS NOT NULL AND TRIM(DCG) <> ''
      UNION ALL SELECT DCD, MACLEUNIK FROM EQUIPE WHERE DCD IS NOT NULL AND TRIM(DCD) <> ''
      UNION ALL SELECT LIB, MACLEUNIK FROM EQUIPE WHERE LIB IS NOT NULL AND TRIM(LIB) <> ''
      UNION ALL SELECT STO, MACLEUNIK FROM EQUIPE WHERE STO IS NOT NULL AND TRIM(STO) <> ''
      UNION ALL SELECT MDLD, MACLEUNIK FROM EQUIPE WHERE MDLD IS NOT NULL AND TRIM(MDLD) <> ''
      UNION ALL SELECT MDLG, MACLEUNIK FROM EQUIPE WHERE MDLG IS NOT NULL AND TRIM(MDLG) <> ''
      UNION ALL SELECT MDCD, MACLEUNIK FROM EQUIPE WHERE MDCD IS NOT NULL AND TRIM(MDCD) <> ''
      UNION ALL SELECT MDCG, MACLEUNIK FROM EQUIPE WHERE MDCG IS NOT NULL AND TRIM(MDCG) <> ''
      UNION ALL SELECT MOLD, MACLEUNIK FROM EQUIPE WHERE MOLD IS NOT NULL AND TRIM(MOLD) <> ''
      UNION ALL SELECT MOLG, MACLEUNIK FROM EQUIPE WHERE MOLG IS NOT NULL AND TRIM(MOLG) <> ''
      UNION ALL SELECT MOCD, MACLEUNIK FROM EQUIPE WHERE MOCD IS NOT NULL AND TRIM(MOCD) <> ''
      UNION ALL SELECT MOCG, MACLEUNIK FROM EQUIPE WHERE MOCG IS NOT NULL AND TRIM(MOCG) <> ''
      UNION ALL SELECT MOCC, MACLEUNIK FROM EQUIPE WHERE MOCC IS NOT NULL AND TRIM(MOCC) <> ''
      UNION ALL SELECT MDCC, MACLEUNIK FROM EQUIPE WHERE MDCC IS NOT NULL AND TRIM(MDCC) <> ''
      UNION ALL SELECT ALD, MACLEUNIK FROM EQUIPE WHERE ALD IS NOT NULL AND TRIM(ALD) <> ''
      UNION ALL SELECT ALG, MACLEUNIK FROM EQUIPE WHERE ALG IS NOT NULL AND TRIM(ALG) <> ''
      UNION ALL SELECT ACD, MACLEUNIK FROM EQUIPE WHERE ACD IS NOT NULL AND TRIM(ACD) <> ''
      UNION ALL SELECT ACG, MACLEUNIK FROM EQUIPE WHERE ACG IS NOT NULL AND TRIM(ACG) <> ''
      UNION ALL SELECT AVC, MACLEUNIK FROM EQUIPE WHERE AVC IS NOT NULL AND TRIM(AVC) <> ''
      UNION ALL SELECT REMP1, MACLEUNIK FROM EQUIPE WHERE REMP1 IS NOT NULL AND TRIM(REMP1) <> ''
      UNION ALL SELECT REMP2, MACLEUNIK FROM EQUIPE WHERE REMP2 IS NOT NULL AND TRIM(REMP2) <> ''
      UNION ALL SELECT REMP3, MACLEUNIK FROM EQUIPE WHERE REMP3 IS NOT NULL AND TRIM(REMP3) <> ''
      UNION ALL SELECT REMP4, MACLEUNIK FROM EQUIPE WHERE REMP4 IS NOT NULL AND TRIM(REMP4) <> ''
      UNION ALL SELECT REMP5, MACLEUNIK FROM EQUIPE WHERE REMP5 IS NOT NULL AND TRIM(REMP5) <> ''
      UNION ALL SELECT REMP6, MACLEUNIK FROM EQUIPE WHERE REMP6 IS NOT NULL AND TRIM(REMP6) <> ''
      UNION ALL SELECT REMP7, MACLEUNIK FROM EQUIPE WHERE REMP7 IS NOT NULL AND TRIM(REMP7) <> ''
      UNION ALL SELECT REMP8, MACLEUNIK FROM EQUIPE WHERE REMP8 IS NOT NULL AND TRIM(REMP8) <> ''
      UNION ALL SELECT REMP9, MACLEUNIK FROM EQUIPE WHERE REMP9 IS NOT NULL AND TRIM(REMP9) <> ''
      UNION ALL SELECT REMP10, MACLEUNIK FROM EQUIPE WHERE REMP10 IS NOT NULL AND TRIM(REMP10) <> ''
      UNION ALL SELECT REMP11, MACLEUNIK FROM EQUIPE WHERE REMP11 IS NOT NULL AND TRIM(REMP11) <> ''
    ),
    official_matches AS (
      SELECT m.MACLEUNIK, m.RECLEUNIK, re.DATE
      FROM MATCH m
      INNER JOIN RENCO re ON re.RECLEUNIK = m.RECLEUNIK
      ${scopeFilterJoins('re')}
      WHERE re.TUCLEUNIK <> 0
        ${scopeFilterClause(scope)}
    ),
    played_matches AS (
      SELECT DISTINCT pm.IDJOUEUR, pm.MACLEUNIK, om.DATE,
        CASE WHEN EXISTS (
          SELECT 1 FROM EVENT ev
          WHERE ev.MACLEUNIK = pm.MACLEUNIK
            AND ${eventPlayer.replace('e.', 'ev.')} = pm.IDJOUEUR
            AND ev.TYPE_EVENT = 1
            AND ev.ADVERSAIRE = 0
        ) THEN 1 ELSE 0 END AS SCORED
      FROM player_matches pm
      INNER JOIN official_matches om ON om.MACLEUNIK = pm.MACLEUNIK
    ),
    streak_groups AS (
      SELECT *,
        SUM(CASE WHEN SCORED = 0 THEN 1 ELSE 0 END) OVER (
          PARTITION BY IDJOUEUR ORDER BY DATE, MACLEUNIK
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS group_id
      FROM played_matches
    ),
    streaks AS (
      SELECT IDJOUEUR, group_id, COUNT(*) AS SERIE, MIN(DATE) AS SERIE_DEBUT, MAX(DATE) AS SERIE_FIN
      FROM streak_groups
      WHERE SCORED = 1
      GROUP BY IDJOUEUR, group_id
    ),
    player_last_matches AS (
      SELECT IDJOUEUR, MAX(DATE) AS DERNIER_MATCH_JOUE
      FROM played_matches
      GROUP BY IDJOUEUR
    ),
    ranked_streaks AS (
      SELECT *, ROW_NUMBER() OVER (
        PARTITION BY IDJOUEUR
        ORDER BY SERIE DESC, SERIE_FIN DESC, SERIE_DEBUT DESC
      ) AS rn
      FROM streaks
    ),
    active_players AS (
      SELECT DISTINCT roster_j.IDJOUEUR
      FROM JOUEUR roster_j
      WHERE ${joueurPresentSql('roster_j')}
    )
    SELECT jr.IDJOUEUR, jr.NOM, jr.PRENOM, jr.SURNOM, jr.IDNATIO,
      rs.SERIE, rs.SERIE_DEBUT, rs.SERIE_FIN,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB,
      CASE WHEN ap.IDJOUEUR IS NOT NULL AND rs.SERIE_FIN = plm.DERNIER_MATCH_JOUE THEN 1 ELSE 0 END AS EN_COURS
    FROM ranked_streaks rs
    INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = rs.IDJOUEUR
    LEFT JOIN active_players ap ON ap.IDJOUEUR = rs.IDJOUEUR
    INNER JOIN player_last_matches plm ON plm.IDJOUEUR = rs.IDJOUEUR
    WHERE rs.rn = 1 AND rs.SERIE > 1
    ORDER BY rs.SERIE DESC, jr.NOM ASC, jr.PRENOM ASC`,
    scope != null ? [scope] : [],
  );
}

export interface ButeurMatchRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  BUTS: number;
  MATCH_DATE: string;
  RECLEUNIK: number;
  EN_CLUB: number;
}

export async function getButeursParMatch(metric: ScoringMetric = 'buts', scope?: number | null): Promise<ButeurMatchRow[]> {
  const { eventPlayer } = scoringColumns(metric);
  return dbAll<ButeurMatchRow>(
    `WITH player_match_goals AS (
      SELECT
        ${eventPlayer} AS IDJOUEUR,
        re.DATE AS MATCH_DATE,
        re.RECLEUNIK,
        COUNT(*) AS BUTS
      FROM EVENT e
      INNER JOIN MATCH m ON m.MACLEUNIK = e.MACLEUNIK
      INNER JOIN RENCO re ON re.RECLEUNIK = m.RECLEUNIK
      ${scopeFilterJoins('re')}
      WHERE e.TYPE_EVENT = 1
        AND e.ADVERSAIRE = 0
        AND ${eventPlayer} IS NOT NULL
        AND TRIM(${eventPlayer}) <> ''
        AND re.TUCLEUNIK <> 0
        ${scopeFilterClause(scope)}
      GROUP BY ${eventPlayer}, re.DATE, re.RECLEUNIK
      HAVING BUTS > 1
    ),
    ranked_player_matches AS (
      SELECT
        pmg.*,
        ROW_NUMBER() OVER (
          PARTITION BY pmg.IDJOUEUR
          ORDER BY pmg.BUTS DESC, pmg.MATCH_DATE DESC, pmg.RECLEUNIK DESC
        ) AS rn
      FROM player_match_goals pmg
    )
    SELECT
      rpm.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      rpm.BUTS,
      rpm.MATCH_DATE,
      rpm.RECLEUNIK,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
    FROM ranked_player_matches rpm
    INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = rpm.IDJOUEUR
    WHERE rpm.rn = 1
    ORDER BY rpm.BUTS DESC, rpm.MATCH_DATE DESC, jr.NOM ASC, jr.PRENOM ASC`,
    scope != null ? [scope] : [],
  );
}

export interface AncienneteRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  SAISONS: number;
}

export async function getNombreAnneesAuClub(playerOnly: boolean): Promise<AncienneteRow[]> {
  const playerFilter = playerOnly ? 'AND p.POS_TYPE = 1' : '';
  return dbAll<AncienneteRow>(
    `SELECT
      jr.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      COUNT(DISTINCT j.SAISON) AS SAISONS
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
    LEFT JOIN Poste p ON p.POS_ID = j.POSTE
     WHERE TRIM(COALESCE(j.SAISON, '')) <> ''
       ${playerFilter}
     GROUP BY jr.IDJOUEUR, jr.NOM, jr.PRENOM, jr.SURNOM, jr.IDNATIO
     HAVING SAISONS > 0
     ORDER BY SAISONS DESC, jr.NOM ASC, jr.PRENOM ASC`,
  );
}

/** First match appearance with age calculation data. */
export interface PremierMatchRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  NAISSANCE: string; // YYYY-MM-DD format
  FIRST_DATE: string; // YYYY-MM-DD format
  MACLEUNIK: number; // Match ID
  RECLEUNIK: number; // Encounter ID for link to match fiche
}

export async function getPremierMatch(order: 'ASC' | 'DESC' = 'ASC', scope?: number | null): Promise<PremierMatchRow[]> {
  const appearanceOrder = order === 'DESC' ? 'DESC' : 'ASC';

  return dbAll<PremierMatchRow>(
    `WITH player_matches AS (
      SELECT GOAL as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE GOAL IS NOT NULL AND TRIM(GOAL) <> ''
      UNION ALL
      SELECT DLG as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE DLG IS NOT NULL AND TRIM(DLG) <> ''
      UNION ALL
      SELECT DLD as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE DLD IS NOT NULL AND TRIM(DLD) <> ''
      UNION ALL
      SELECT DCG as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE DCG IS NOT NULL AND TRIM(DCG) <> ''
      UNION ALL
      SELECT DCD as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE DCD IS NOT NULL AND TRIM(DCD) <> ''
      UNION ALL
      SELECT LIB as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE LIB IS NOT NULL AND TRIM(LIB) <> ''
      UNION ALL
      SELECT STO as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE STO IS NOT NULL AND TRIM(STO) <> ''
      UNION ALL
      SELECT MDLD as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE MDLD IS NOT NULL AND TRIM(MDLD) <> ''
      UNION ALL
      SELECT MDLG as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE MDLG IS NOT NULL AND TRIM(MDLG) <> ''
      UNION ALL
      SELECT MDCD as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE MDCD IS NOT NULL AND TRIM(MDCD) <> ''
      UNION ALL
      SELECT MDCG as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE MDCG IS NOT NULL AND TRIM(MDCG) <> ''
      UNION ALL
      SELECT MOLD as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE MOLD IS NOT NULL AND TRIM(MOLD) <> ''
      UNION ALL
      SELECT MOLG as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE MOLG IS NOT NULL AND TRIM(MOLG) <> ''
      UNION ALL
      SELECT MOCD as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE MOCD IS NOT NULL AND TRIM(MOCD) <> ''
      UNION ALL
      SELECT MOCG as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE MOCG IS NOT NULL AND TRIM(MOCG) <> ''
      UNION ALL
      SELECT MOCC as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE MOCC IS NOT NULL AND TRIM(MOCC) <> ''
      UNION ALL
      SELECT MDCC as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE MDCC IS NOT NULL AND TRIM(MDCC) <> ''
      UNION ALL
      SELECT ALD as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE ALD IS NOT NULL AND TRIM(ALD) <> ''
      UNION ALL
      SELECT ALG as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE ALG IS NOT NULL AND TRIM(ALG) <> ''
      UNION ALL
      SELECT ACD as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE ACD IS NOT NULL AND TRIM(ACD) <> ''
      UNION ALL
      SELECT ACG as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE ACG IS NOT NULL AND TRIM(ACG) <> ''
      UNION ALL
      SELECT AVC as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE AVC IS NOT NULL AND TRIM(AVC) <> ''
      UNION ALL
      SELECT REMP1 as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE REMP1 IS NOT NULL AND TRIM(REMP1) <> ''
      UNION ALL
      SELECT REMP2 as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE REMP2 IS NOT NULL AND TRIM(REMP2) <> ''
      UNION ALL
      SELECT REMP3 as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE REMP3 IS NOT NULL AND TRIM(REMP3) <> ''
      UNION ALL
      SELECT REMP4 as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE REMP4 IS NOT NULL AND TRIM(REMP4) <> ''
      UNION ALL
      SELECT REMP5 as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE REMP5 IS NOT NULL AND TRIM(REMP5) <> ''
      UNION ALL
      SELECT REMP6 as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE REMP6 IS NOT NULL AND TRIM(REMP6) <> ''
      UNION ALL
      SELECT REMP7 as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE REMP7 IS NOT NULL AND TRIM(REMP7) <> ''
      UNION ALL
      SELECT REMP8 as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE REMP8 IS NOT NULL AND TRIM(REMP8) <> ''
      UNION ALL
      SELECT REMP9 as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE REMP9 IS NOT NULL AND TRIM(REMP9) <> ''
      UNION ALL
      SELECT REMP10 as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE REMP10 IS NOT NULL AND TRIM(REMP10) <> ''
      UNION ALL
      SELECT REMP11 as IDJOUEUR, e.DATE, e.MACLEUNIK FROM EQUIPE e WHERE REMP11 IS NOT NULL AND TRIM(REMP11) <> ''
    ),
    official_player_matches AS (
      SELECT pm.IDJOUEUR, pm.DATE, pm.MACLEUNIK
      FROM player_matches pm
      JOIN MATCH m ON m.MACLEUNIK = pm.MACLEUNIK
      JOIN RENCO re ON re.RECLEUNIK = m.RECLEUNIK
      ${scopeFilterJoins('re')}
      WHERE re.TUCLEUNIK <> 0
        ${scopeFilterClause(scope)}
    ),
    first_appearance AS (
      SELECT 
        IDJOUEUR,
        DATE as FIRST_DATE,
        MACLEUNIK,
        ROW_NUMBER() OVER (PARTITION BY IDJOUEUR ORDER BY DATE ${appearanceOrder}, MACLEUNIK ${appearanceOrder}) as rn
      FROM official_player_matches
    )
    SELECT
      fa.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      jr.NAISSANCE,
      fa.FIRST_DATE,
      fa.MACLEUNIK,
      re.RECLEUNIK
    FROM first_appearance fa
    JOIN JOUEURRG jr ON jr.IDJOUEUR = fa.IDJOUEUR
    JOIN MATCH m ON m.MACLEUNIK = fa.MACLEUNIK
    JOIN RENCO re ON re.RECLEUNIK = m.RECLEUNIK
    WHERE fa.rn = 1 
      AND jr.NAISSANCE IS NOT NULL 
      AND TRIM(jr.NAISSANCE) <> ''
      AND re.TUCLEUNIK <> 0
    ORDER BY fa.FIRST_DATE ${appearanceOrder}, jr.NOM ASC, jr.PRENOM ASC`,
    scope != null ? [scope] : [],
  );
}

export type TransfertMetric = 'achats' | 'ventes' | 'plus-values' | 'moins-values';

export interface TransfertRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  MONTANT: number;
  CLUB_ID: string | null;
  CLUB_NOM: string | null;
  CLUB_IDNATIO: string | null;
  EN_CLUB: number;
}

/** Indemnites converties en devise par defaut (DEVISE.CONVERSION); DVCLEUNIK sans ligne DEVISE (ex: 0) => facteur 1. */
const MONTANT_EN_DEVISE_DEFAUT = 'CAST(t.INDEMNITES AS REAL) / COALESCE(NULLIF(d.CONVERSION, 0), 1)';

export async function getTransferts(metric: TransfertMetric = 'achats'): Promise<TransfertRow[]> {
  if (metric === 'achats' || metric === 'ventes') {
    const statut = metric === 'achats' ? 2 : 1;
    return dbAll<TransfertRow>(
      `SELECT
        jr.IDJOUEUR,
        jr.NOM,
        jr.PRENOM,
        jr.SURNOM,
        jr.IDNATIO,
        ${MONTANT_EN_DEVISE_DEFAUT} AS MONTANT,
        t.IDCLUB AS CLUB_ID,
        c.CLUB AS CLUB_NOM,
        c.IDNATIO AS CLUB_IDNATIO,
        CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
       FROM TRANSAC t
       INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = t.IDJOUEUR
       LEFT JOIN DEVISE d ON d.DVCLEUNIK = t.DVCLEUNIK
       LEFT JOIN CLUB c ON c.IDCLUB = t.IDCLUB
       WHERE t.STATUT = ? AND COALESCE(t.INDEMNITES, 0) > 0
       ORDER BY MONTANT DESC, jr.NOM ASC, jr.PRENOM ASC`,
      [statut],
    );
  }

  const order = metric === 'plus-values' ? 'DESC' : 'ASC';
  const having = metric === 'plus-values' ? 'BALANCE > 0' : 'BALANCE < 0';
  return dbAll<TransfertRow>(
    `WITH player_balance AS (
      SELECT
        t.IDJOUEUR,
        SUM(CASE WHEN t.STATUT = 1 THEN ${MONTANT_EN_DEVISE_DEFAUT} ELSE 0 END)
          - SUM(CASE WHEN t.STATUT = 2 THEN ${MONTANT_EN_DEVISE_DEFAUT} ELSE 0 END) AS BALANCE
      FROM TRANSAC t
      LEFT JOIN DEVISE d ON d.DVCLEUNIK = t.DVCLEUNIK
      WHERE COALESCE(t.INDEMNITES, 0) > 0 AND t.STATUT IN (1, 2)
      GROUP BY t.IDJOUEUR
      HAVING ${having}
    )
    SELECT
      jr.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      ABS(pb.BALANCE) AS MONTANT,
      NULL AS CLUB_ID,
      NULL AS CLUB_NOM,
      NULL AS CLUB_IDNATIO,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
    FROM player_balance pb
    INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = pb.IDJOUEUR
    WHERE NOT (${joueurPresentSql()})
    ORDER BY pb.BALANCE ${order}, jr.NOM ASC, jr.PRENOM ASC`,
  );
}

export type PhysiqueMetric = 'grands' | 'petits' | 'gabarits';

export interface PhysiqueRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  HAUTEUR: number;
  POIDS: number | null;
  IMC: number | null;
  EN_CLUB: number;
}

export async function getPhysique(metric: PhysiqueMetric = 'grands'): Promise<PhysiqueRow[]> {
  const gabarits = metric === 'gabarits';
  const filtrePoids = gabarits ? 'AND COALESCE(jr.POIDS, 0) > 0' : '';
  const tri = gabarits
    ? 'IMC DESC'
    : `jr.HAUTEUR ${metric === 'petits' ? 'ASC' : 'DESC'}`;

  return dbAll<PhysiqueRow>(
    `SELECT
      jr.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      jr.HAUTEUR,
      jr.POIDS,
      ROUND(CAST(jr.POIDS AS REAL) / ((CAST(jr.HAUTEUR AS REAL) / 100) * (CAST(jr.HAUTEUR AS REAL) / 100)), 1) AS IMC,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
     FROM JOUEURRG jr
     WHERE COALESCE(jr.HAUTEUR, 0) > 0 ${filtrePoids}
     ORDER BY ${tri}, jr.NOM ASC, jr.PRENOM ASC`,
  );
}

export async function getDernierMatch(scope?: number | null): Promise<PremierMatchRow[]> {
  return getPremierMatch('DESC', scope);
}

export type PerformanceMetric = 'victoires' | 'nuls' | 'defaites';

export interface PerformanceRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  RESULTATS: number;
  MATCHES: number;
  POURCENTAGE: number;
  EN_CLUB: number;
}

function performanceCondition(metric: PerformanceMetric): string {
  const supportedGoals = 'CASE WHEN om.DOMICILE = ? THEN om.BUTDOM ELSE om.BUTEXT END';
  const opponentGoals = 'CASE WHEN om.DOMICILE = ? THEN om.BUTEXT ELSE om.BUTDOM END';
  if (metric === 'nuls') return `${supportedGoals} = ${opponentGoals}`;
  if (metric === 'defaites') return `${supportedGoals} < ${opponentGoals}`;
  return `${supportedGoals} > ${opponentGoals}`;
}

export async function getPerformances(metric: PerformanceMetric = 'victoires', scope?: number | null): Promise<PerformanceRow[]> {
  const supportedClubId = getSupportedClubIdFromEnv();
  return dbAll<PerformanceRow>(
    `WITH official_matches AS (
      SELECT m.MACLEUNIK, re.DOMICILE, re.BUTDOM, re.BUTEXT
      FROM MATCH m
      INNER JOIN RENCO re ON re.RECLEUNIK = m.RECLEUNIK
      ${scopeFilterJoins('re')}
      WHERE re.TUCLEUNIK <> 0
        AND (re.DOMICILE = ? OR re.EXTERIEUR = ?)
        ${scopeFilterClause(scope)}
    ),
    player_matches AS (
      SELECT GOAL AS IDJOUEUR, MACLEUNIK FROM EQUIPE WHERE GOAL IS NOT NULL AND TRIM(GOAL) <> ''
      UNION SELECT DLG, MACLEUNIK FROM EQUIPE WHERE DLG IS NOT NULL AND TRIM(DLG) <> ''
      UNION SELECT DLD, MACLEUNIK FROM EQUIPE WHERE DLD IS NOT NULL AND TRIM(DLD) <> ''
      UNION SELECT DCG, MACLEUNIK FROM EQUIPE WHERE DCG IS NOT NULL AND TRIM(DCG) <> ''
      UNION SELECT DCD, MACLEUNIK FROM EQUIPE WHERE DCD IS NOT NULL AND TRIM(DCD) <> ''
      UNION SELECT LIB, MACLEUNIK FROM EQUIPE WHERE LIB IS NOT NULL AND TRIM(LIB) <> ''
      UNION SELECT STO, MACLEUNIK FROM EQUIPE WHERE STO IS NOT NULL AND TRIM(STO) <> ''
      UNION SELECT MDLD, MACLEUNIK FROM EQUIPE WHERE MDLD IS NOT NULL AND TRIM(MDLD) <> ''
      UNION SELECT MDLG, MACLEUNIK FROM EQUIPE WHERE MDLG IS NOT NULL AND TRIM(MDLG) <> ''
      UNION SELECT MDCD, MACLEUNIK FROM EQUIPE WHERE MDCD IS NOT NULL AND TRIM(MDCD) <> ''
      UNION SELECT MDCG, MACLEUNIK FROM EQUIPE WHERE MDCG IS NOT NULL AND TRIM(MDCG) <> ''
      UNION SELECT MOLD, MACLEUNIK FROM EQUIPE WHERE MOLD IS NOT NULL AND TRIM(MOLD) <> ''
      UNION SELECT MOLG, MACLEUNIK FROM EQUIPE WHERE MOLG IS NOT NULL AND TRIM(MOLG) <> ''
      UNION SELECT MOCD, MACLEUNIK FROM EQUIPE WHERE MOCD IS NOT NULL AND TRIM(MOCD) <> ''
      UNION SELECT MOCG, MACLEUNIK FROM EQUIPE WHERE MOCG IS NOT NULL AND TRIM(MOCG) <> ''
      UNION SELECT MOCC, MACLEUNIK FROM EQUIPE WHERE MOCC IS NOT NULL AND TRIM(MOCC) <> ''
      UNION SELECT MDCC, MACLEUNIK FROM EQUIPE WHERE MDCC IS NOT NULL AND TRIM(MDCC) <> ''
      UNION SELECT ALD, MACLEUNIK FROM EQUIPE WHERE ALD IS NOT NULL AND TRIM(ALD) <> ''
      UNION SELECT ALG, MACLEUNIK FROM EQUIPE WHERE ALG IS NOT NULL AND TRIM(ALG) <> ''
      UNION SELECT ACD, MACLEUNIK FROM EQUIPE WHERE ACD IS NOT NULL AND TRIM(ACD) <> ''
      UNION SELECT ACG, MACLEUNIK FROM EQUIPE WHERE ACG IS NOT NULL AND TRIM(ACG) <> ''
      UNION SELECT AVC, MACLEUNIK FROM EQUIPE WHERE AVC IS NOT NULL AND TRIM(AVC) <> ''
      UNION SELECT ev.JOUEUR2, ev.MACLEUNIK FROM EVENT ev
        WHERE ev.TYPE_EVENT = 2 AND ev.ADVERSAIRE = 0
          AND ev.JOUEUR2 IS NOT NULL AND TRIM(ev.JOUEUR2) <> ''
    ),
    player_results AS (
      SELECT
        pm.IDJOUEUR,
        COUNT(*) AS MATCHES,
        SUM(CASE WHEN ${performanceCondition(metric)} THEN 1 ELSE 0 END) AS RESULTATS
      FROM player_matches pm
      INNER JOIN official_matches om ON om.MACLEUNIK = pm.MACLEUNIK
      GROUP BY pm.IDJOUEUR
    )
    SELECT
      jr.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      pr.RESULTATS,
      pr.MATCHES,
      ROUND(CAST(pr.RESULTATS AS REAL) * 100 / pr.MATCHES, 1) AS POURCENTAGE,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
    FROM player_results pr
    INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = pr.IDJOUEUR
    WHERE pr.RESULTATS > 0 AND pr.MATCHES >= 10
    ORDER BY pr.RESULTATS DESC, jr.NOM ASC, jr.PRENOM ASC`,
    [supportedClubId, supportedClubId, ...(scope != null ? [scope] : []), supportedClubId, supportedClubId],
  );
}
