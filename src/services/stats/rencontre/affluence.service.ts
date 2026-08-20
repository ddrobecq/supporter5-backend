import { dbAll } from '../../../config/database';
import { buildCircCompletResolver, CIRC_COMPLET_JOINS, CIRC_COMPLET_SELECT, type CircCompletSourceRow } from '../../../lib/circComplet';
import { getLatestTerrainForClub } from '../../../lib/clubTerrain';
import { scopeFilterClause, scopeFilterJoins } from '../../../lib/matchScopeFilter';
import { getSupportedClubIdFromEnv } from '../../../lib/supportedClub';

export interface AffluenceRow {
  RECLEUNIK: number;
  DATE: string;
  CIRC_COMPLET: string;
  TERRAIN_NOM: string;
  ADVERSAIRE_ID: string;
  ADVERSAIRE_NOM: string;
  ADVERSAIRE_IDNATIO: string | null;
  NBSPECT: number;
}

type AffluenceQueryRow = CircCompletSourceRow & {
  RECLEUNIK: number;
  DATE: string;
  DOMICILE: string;
  EXTERIEUR: string;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
  DOMICILE_IDNATIO: string | null;
  EXTERIEUR_IDNATIO: string | null;
  TERRAIN_NOM: string;
  NBSPECT: number;
};

/** Rencontres du club supporte classees par affluence decroissante (huis-clos exclus, MATCH.NBSPECT = -1). */
export async function getAffluence(scope?: number | null): Promise<AffluenceRow[]> {
  const supportedClubId = getSupportedClubIdFromEnv();

  const rows = await dbAll<AffluenceQueryRow>(
    `SELECT
       r.RECLEUNIK,
       REPLACE(COALESCE(r.DATE, ''), '-', '') AS DATE,
       r.DOMICILE,
       r.EXTERIEUR,
       COALESCE(cd.CLUB, r.DOMICILE, '') AS DOMICILE_NOM,
       COALESCE(ce.CLUB, r.EXTERIEUR, '') AS EXTERIEUR_NOM,
       cd.IDNATIO AS DOMICILE_IDNATIO,
       ce.IDNATIO AS EXTERIEUR_IDNATIO,
       COALESCE(te.STADE, '') AS TERRAIN_NOM,
       m.NBSPECT AS NBSPECT,
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
       AND m.NBSPECT > -1
       ${scopeFilterClause(scope)}
     ORDER BY m.NBSPECT DESC, DATE DESC`,
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
      NBSPECT: Number(row.NBSPECT ?? 0),
    };
  });
}
