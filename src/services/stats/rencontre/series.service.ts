import { dbAll } from '../../../config/database';
import { scopeFilterClause, scopeFilterJoins } from '../../../lib/matchScopeFilter';
import { getSupportedClubIdFromEnv } from '../../../lib/supportedClub';

export type RencontreSerieMetric = 'victoires' | 'nuls' | 'defaites' | 'invincibilite' | 'inviolabilite' | 'inefficacite';

export interface RencontreSerieRow {
  SERIE: number;
  SERIE_DEBUT: string;
  SERIE_DEBUT_RECLEUNIK: number;
  SERIE_FIN: string;
  SERIE_FIN_RECLEUNIK: number;
  EN_COURS: number;
}

function serieCondition(metric: RencontreSerieMetric): string {
  switch (metric) {
    case 'victoires': return 'BUT_POUR > BUT_CONTRE';
    case 'nuls': return 'BUT_POUR = BUT_CONTRE';
    case 'defaites': return 'BUT_POUR < BUT_CONTRE';
    case 'invincibilite': return 'BUT_POUR >= BUT_CONTRE';
    case 'inviolabilite': return 'BUT_CONTRE = 0';
    case 'inefficacite': return 'BUT_POUR = 0';
  }
}

/** Plus longues series de resultats du club supporte (victoires/nuls/defaites/invincibilite/inviolabilite/inefficacite). */
export async function getRencontreSeries(metric: RencontreSerieMetric, scope?: number | null): Promise<RencontreSerieRow[]> {
  const supportedClubId = getSupportedClubIdFromEnv();
  const condition = serieCondition(metric);

  return dbAll<RencontreSerieRow>(
    `WITH matches AS (
      SELECT
        r.RECLEUNIK,
        REPLACE(COALESCE(r.DATE, ''), '-', '') AS DATE,
        CASE WHEN r.DOMICILE = ? THEN COALESCE(r.BUTDOM, 0) ELSE COALESCE(r.BUTEXT, 0) END AS BUT_POUR,
        CASE WHEN r.DOMICILE = ? THEN COALESCE(r.BUTEXT, 0) ELSE COALESCE(r.BUTDOM, 0) END AS BUT_CONTRE
      FROM RENCO r
      ${scopeFilterJoins()}
      WHERE COALESCE(r.TUCLEUNIK, 0) <> 0
        AND COALESCE(r.ETAT, 0) = 3
        AND (r.DOMICILE = ? OR r.EXTERIEUR = ?)
        ${scopeFilterClause(scope)}
    ),
    flagged AS (
      SELECT *, CASE WHEN ${condition} THEN 1 ELSE 0 END AS MATCH_FLAG
      FROM matches
    ),
    grouped AS (
      SELECT *,
        SUM(CASE WHEN MATCH_FLAG = 0 THEN 1 ELSE 0 END) OVER (ORDER BY DATE, RECLEUNIK ROWS UNBOUNDED PRECEDING) AS GROUP_ID
      FROM flagged
    ),
    bounded AS (
      SELECT
        GROUP_ID,
        COUNT(*) OVER (PARTITION BY GROUP_ID) AS SERIE,
        FIRST_VALUE(DATE) OVER (PARTITION BY GROUP_ID ORDER BY DATE, RECLEUNIK) AS SERIE_DEBUT,
        FIRST_VALUE(RECLEUNIK) OVER (PARTITION BY GROUP_ID ORDER BY DATE, RECLEUNIK) AS SERIE_DEBUT_RECLEUNIK,
        LAST_VALUE(DATE) OVER (PARTITION BY GROUP_ID ORDER BY DATE, RECLEUNIK ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS SERIE_FIN,
        LAST_VALUE(RECLEUNIK) OVER (PARTITION BY GROUP_ID ORDER BY DATE, RECLEUNIK ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS SERIE_FIN_RECLEUNIK
      FROM grouped
      WHERE MATCH_FLAG = 1
    ),
    last_played AS (SELECT MAX(DATE) AS LAST_DATE FROM matches)
    SELECT DISTINCT
      b.SERIE, b.SERIE_DEBUT, b.SERIE_DEBUT_RECLEUNIK, b.SERIE_FIN, b.SERIE_FIN_RECLEUNIK,
      CASE WHEN b.SERIE_FIN = lp.LAST_DATE THEN 1 ELSE 0 END AS EN_COURS
    FROM bounded b, last_played lp
    WHERE b.SERIE > 1
    ORDER BY b.SERIE DESC, b.SERIE_FIN DESC`,
    [supportedClubId, supportedClubId, supportedClubId, supportedClubId, ...(scope != null ? [scope] : [])],
  );
}
