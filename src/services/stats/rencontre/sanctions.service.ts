import { dbAll } from '../../../config/database';
import { buildCircCompletResolver, CIRC_COMPLET_JOINS, CIRC_COMPLET_SELECT, type CircCompletSourceRow } from '../../../lib/circComplet';
import { getLatestTerrainForClub } from '../../../lib/clubTerrain';
import { scopeFilterClause, scopeFilterJoins } from '../../../lib/matchScopeFilter';
import { getSupportedClubIdFromEnv } from '../../../lib/supportedClub';

export type SanctionMetric = 'avertissements' | 'exclusions';

export interface RencontreSanctionRow {
  RECLEUNIK: number;
  DATE: string;
  CIRC_COMPLET: string;
  TERRAIN_NOM: string;
  ADVERSAIRE_ID: string;
  ADVERSAIRE_NOM: string;
  ADVERSAIRE_IDNATIO: string | null;
  NB_SANCTIONS: number;
}

type SanctionQueryRow = CircCompletSourceRow & {
  RECLEUNIK: number;
  DATE: string;
  DOMICILE: string;
  EXTERIEUR: string;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
  DOMICILE_IDNATIO: string | null;
  EXTERIEUR_IDNATIO: string | null;
  TERRAIN_NOM: string;
  NB_SANCTIONS: number;
};

const METRIC_TYPE_EVENT: Record<SanctionMetric, string> = {
  avertissements: '(3, 4)',
  exclusions: '(5)',
};

/** Rencontres du club supporte classees par nombre decroissant de cartons (avertissements TYPE_EVENT 3/4, exclusions 5). */
export async function getRencontreSanctions(metric: SanctionMetric, scope?: number | null): Promise<RencontreSanctionRow[]> {
  const supportedClubId = getSupportedClubIdFromEnv();

  const rows = await dbAll<SanctionQueryRow>(
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
        COALESCE(te.STADE, '') AS TERRAIN_NOM,
        (SELECT COUNT(*) FROM EVENT ev WHERE ev.MACLEUNIK = m.MACLEUNIK AND ev.TYPE_EVENT IN ${METRIC_TYPE_EVENT[metric]}) AS NB_SANCTIONS,
        ${CIRC_COMPLET_SELECT}
      FROM RENCO r
      ${CIRC_COMPLET_JOINS}
      ${scopeFilterJoins()}
      INNER JOIN MATCH m ON m.RECLEUNIK = r.RECLEUNIK
      LEFT JOIN TERRAIN te ON te.TECLEUNIK = m.TECLEUNIK
      LEFT JOIN CLUB cd ON cd.IDCLUB = r.DOMICILE
      LEFT JOIN CLUB ce ON ce.IDCLUB = r.EXTERIEUR
      WHERE COALESCE(r.TUCLEUNIK, 0) <> 0
        AND COALESCE(r.ETAT, 0) <> 4
        AND (r.DOMICILE = ? OR r.EXTERIEUR = ?)
        ${scopeFilterClause(scope)}
    )
    SELECT * FROM rencontres
    WHERE NB_SANCTIONS > 0
    ORDER BY NB_SANCTIONS DESC, DATE DESC`,
    [supportedClubId, supportedClubId, ...(scope != null ? [scope] : [])],
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
      ADVERSAIRE_ID: String((isHome ? row.EXTERIEUR : row.DOMICILE) ?? ''),
      ADVERSAIRE_NOM: String((isHome ? row.EXTERIEUR_NOM : row.DOMICILE_NOM) ?? ''),
      ADVERSAIRE_IDNATIO: (isHome ? row.EXTERIEUR_IDNATIO : row.DOMICILE_IDNATIO) ?? null,
      NB_SANCTIONS: Number(row.NB_SANCTIONS ?? 0),
    };
  });
}
