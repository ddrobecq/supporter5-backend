import { dbAll } from '../../../config/database';
import { buildCircCompletResolver } from '../../../lib/circComplet';
import { createLatestTerrainNameResolver, mapSupportedMatchRow, supportedMatchesSql, type SupportedMatchQueryRow } from '../../../lib/supportedMatches';
import { getSupportedClubIdFromEnv } from '../../../lib/supportedClub';

export type ScoreMetric = 'victoires' | 'defaites' | 'prolifiques';

export interface ScoreRow {
  RECLEUNIK: number;
  DATE: string;
  CIRC_COMPLET: string;
  TERRAIN_NOM: string;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
  ADVERSAIRE_ID: string;
  ADVERSAIRE_NOM: string;
  ADVERSAIRE_IDNATIO: string | null;
  BUT_POUR: number;
  BUT_CONTRE: number;
  ECART: number;
  TOTAL_BUTS: number;
}

type ScoreQueryRow = SupportedMatchQueryRow & {
  BUTDOM: number;
  BUTEXT: number;
  ECART: number;
  TOTAL_BUTS: number;
};

const METRIC_FILTERS: Record<ScoreMetric, string> = {
  victoires: 'ECART > 0',
  defaites: 'ECART < 0',
  prolifiques: 'TOTAL_BUTS > 0',
};

const METRIC_ORDERS: Record<ScoreMetric, string> = {
  victoires: 'ECART DESC, TOTAL_BUTS DESC',
  defaites: 'ECART ASC, TOTAL_BUTS DESC',
  prolifiques: 'TOTAL_BUTS DESC, ECART DESC',
};

/** Statistiques de scores du club supporte: plus larges victoires/defaites, matchs les plus prolifiques. */
export async function getScores(metric: ScoreMetric, scope?: number | null): Promise<ScoreRow[]> {
  const supportedClubId = getSupportedClubIdFromEnv();

  const rows = await dbAll<ScoreQueryRow>(
    `WITH rencontres AS (
      ${supportedMatchesSql({
        extraSelect: [
          'COALESCE(r.BUTDOM, 0) AS BUTDOM',
          'COALESCE(r.BUTEXT, 0) AS BUTEXT',
          `CASE WHEN r.DOMICILE = ? THEN COALESCE(r.BUTDOM, 0) - COALESCE(r.BUTEXT, 0)
             ELSE COALESCE(r.BUTEXT, 0) - COALESCE(r.BUTDOM, 0) END AS ECART`,
          'COALESCE(r.BUTDOM, 0) + COALESCE(r.BUTEXT, 0) AS TOTAL_BUTS',
        ],
        matchJoin: 'LEFT',
        scope,
      })}
    )
    SELECT * FROM rencontres
    WHERE ${METRIC_FILTERS[metric]}
    ORDER BY ${METRIC_ORDERS[metric]}, DATE DESC`,
    [supportedClubId, supportedClubId, supportedClubId, ...(scope != null ? [scope] : [])],
  );

  const context = { supportedClubId, circ: await buildCircCompletResolver(rows), latestTerrainName: createLatestTerrainNameResolver() };

  return rows.map((row) => {
    const isHome = String(row.DOMICILE ?? '') === supportedClubId;
    return {
      ...mapSupportedMatchRow(row, context, { withSideNames: true }),
      BUT_POUR: isHome ? Number(row.BUTDOM ?? 0) : Number(row.BUTEXT ?? 0),
      BUT_CONTRE: isHome ? Number(row.BUTEXT ?? 0) : Number(row.BUTDOM ?? 0),
      ECART: Number(row.ECART ?? 0),
      TOTAL_BUTS: Number(row.TOTAL_BUTS ?? 0),
    };
  });
}
