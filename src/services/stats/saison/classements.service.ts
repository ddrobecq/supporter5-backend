import { dbAll } from '../../../config/database';
import { joueurPresentSql } from '../joueur/joueurPresent';

export type SaisonClassementMetric = 'temps' | 'buts' | 'passes' | 'sanctions';

export interface SaisonClassementRow {
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  SAISON: string;
  VALEUR: number;
  JAUNES: number;
  ROUGES: number;
  EN_CLUB: number;
}

// Un carton rouge pese deux fois un jaune (score de tri, non affiche).
const METRIC_VALUE: Record<SaisonClassementMetric, string> = {
  temps: 'SUM(COALESCE(j.TEMPSTOTAL, 0))',
  buts: 'SUM(COALESCE(j.BUTTOTAL, 0))',
  passes: 'SUM(COALESCE(j.PASSETOTAL, 0))',
  sanctions: 'SUM(COALESCE(j.JAUNETOTAL, 0)) + 2 * SUM(COALESCE(j.ROUGETOTAL, 0))',
};

/** Saisons ayant au moins une donnee exploitable, de la plus recente a la plus ancienne. */
export async function getSaisonsDisponibles(): Promise<string[]> {
  const rows = await dbAll<{ SAISON: string }>(
    `SELECT SAISON
     FROM JOUEUR
     WHERE TRIM(COALESCE(SAISON, '')) <> ''
     GROUP BY SAISON
     HAVING SUM(COALESCE(TEMPSTOTAL, 0) + COALESCE(BUTTOTAL, 0) + COALESCE(PASSETOTAL, 0)
       + COALESCE(JAUNETOTAL, 0) + COALESCE(ROUGETOTAL, 0)) > 0
     ORDER BY SAISON DESC`,
  );
  return rows.map((row) => String(row.SAISON));
}

/** Classement des joueurs d'une saison (temps de jeu, buts, passes ou sanctions). */
export async function getSaisonClassement(metric: SaisonClassementMetric, saison: string): Promise<SaisonClassementRow[]> {
  return dbAll<SaisonClassementRow>(
    `SELECT
      jr.IDJOUEUR,
      jr.NOM,
      jr.PRENOM,
      jr.SURNOM,
      jr.IDNATIO,
      j.SAISON,
      ${METRIC_VALUE[metric]} AS VALEUR,
      SUM(COALESCE(j.JAUNETOTAL, 0)) AS JAUNES,
      SUM(COALESCE(j.ROUGETOTAL, 0)) AS ROUGES,
      CASE WHEN ${joueurPresentSql()} THEN 1 ELSE 0 END AS EN_CLUB
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
     INNER JOIN Poste p ON p.POS_ID = j.POSTE AND p.POS_TYPE = 1
     WHERE j.SAISON = ?
     GROUP BY jr.IDJOUEUR, jr.NOM, jr.PRENOM, jr.SURNOM, jr.IDNATIO, j.SAISON
     HAVING VALEUR > 0
     ORDER BY VALEUR DESC, jr.NOM ASC, jr.PRENOM ASC`,
    [saison],
  );
}
