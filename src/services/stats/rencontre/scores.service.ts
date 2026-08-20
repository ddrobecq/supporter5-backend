import { dbAll } from '../../../config/database';
import { buildCircCompletResolver, CIRC_COMPLET_JOINS, CIRC_COMPLET_SELECT, type CircCompletSourceRow } from '../../../lib/circComplet';
import { getLatestTerrainForClub } from '../../../lib/clubTerrain';
import { scopeFilterClause, scopeFilterJoins } from '../../../lib/matchScopeFilter';
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

type ScoreQueryRow = CircCompletSourceRow & {
  RECLEUNIK: number;
  DATE: string;
  DOMICILE: string;
  EXTERIEUR: string;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
  DOMICILE_IDNATIO: string | null;
  EXTERIEUR_IDNATIO: string | null;
  BUTDOM: number;
  BUTEXT: number;
  TERRAIN_NOM: string;
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
      SELECT
        r.RECLEUNIK,
        REPLACE(COALESCE(r.DATE, ''), '-', '') AS DATE,
        r.DOMICILE,
        r.EXTERIEUR,
        COALESCE(cd.CLUB, r.DOMICILE, '') AS DOMICILE_NOM,
        COALESCE(ce.CLUB, r.EXTERIEUR, '') AS EXTERIEUR_NOM,
        cd.IDNATIO AS DOMICILE_IDNATIO,
        ce.IDNATIO AS EXTERIEUR_IDNATIO,
        COALESCE(r.BUTDOM, 0) AS BUTDOM,
        COALESCE(r.BUTEXT, 0) AS BUTEXT,
        COALESCE(te.STADE, '') AS TERRAIN_NOM,
        CASE WHEN r.DOMICILE = ? THEN COALESCE(r.BUTDOM, 0) - COALESCE(r.BUTEXT, 0)
             ELSE COALESCE(r.BUTEXT, 0) - COALESCE(r.BUTDOM, 0) END AS ECART,
        COALESCE(r.BUTDOM, 0) + COALESCE(r.BUTEXT, 0) AS TOTAL_BUTS,
        ${CIRC_COMPLET_SELECT}
      FROM RENCO r
      ${CIRC_COMPLET_JOINS}
      ${scopeFilterJoins()}
      LEFT JOIN MATCH m ON m.RECLEUNIK = r.RECLEUNIK
      LEFT JOIN TERRAIN te ON te.TECLEUNIK = m.TECLEUNIK
      LEFT JOIN CLUB cd ON cd.IDCLUB = r.DOMICILE
      LEFT JOIN CLUB ce ON ce.IDCLUB = r.EXTERIEUR
      WHERE COALESCE(r.TUCLEUNIK, 0) <> 0
        AND COALESCE(r.ETAT, 0) <> 4
        AND (r.DOMICILE = ? OR r.EXTERIEUR = ?)
        ${scopeFilterClause(scope)}
    )
    SELECT * FROM rencontres
    WHERE ${METRIC_FILTERS[metric]}
    ORDER BY ${METRIC_ORDERS[metric]}, DATE DESC`,
    [supportedClubId, supportedClubId, supportedClubId, ...(scope != null ? [scope] : [])],
  );

  const resolver = await buildCircCompletResolver(rows);

  return rows.map((row) => {
    const isHome = String(row.DOMICILE ?? '') === supportedClubId;
    const terrain = String(row.TERRAIN_NOM ?? '').trim()
      || getLatestTerrainForClub(row.DOMICILE)?.TERRAIN_NOM
      || '';

    return {
      RECLEUNIK: Number(row.RECLEUNIK),
      DATE: String(row.DATE ?? ''),
      CIRC_COMPLET: resolver.circComplet(row),
      TERRAIN_NOM: terrain,
      DOMICILE_NOM: String(row.DOMICILE_NOM ?? ''),
      EXTERIEUR_NOM: String(row.EXTERIEUR_NOM ?? ''),
      ADVERSAIRE_ID: String((isHome ? row.EXTERIEUR : row.DOMICILE) ?? ''),
      ADVERSAIRE_NOM: String((isHome ? row.EXTERIEUR_NOM : row.DOMICILE_NOM) ?? ''),
      ADVERSAIRE_IDNATIO: (isHome ? row.EXTERIEUR_IDNATIO : row.DOMICILE_IDNATIO) ?? null,
      BUT_POUR: isHome ? Number(row.BUTDOM ?? 0) : Number(row.BUTEXT ?? 0),
      BUT_CONTRE: isHome ? Number(row.BUTEXT ?? 0) : Number(row.BUTDOM ?? 0),
      ECART: Number(row.ECART ?? 0),
      TOTAL_BUTS: Number(row.TOTAL_BUTS ?? 0),
    };
  });
}
