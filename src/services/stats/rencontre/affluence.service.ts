import { dbAll } from '../../../config/database';
import { buildCircCompletResolver } from '../../../lib/circComplet';
import { createLatestTerrainNameResolver, mapSupportedMatchRow, supportedMatchesSql, type SupportedMatchQueryRow } from '../../../lib/supportedMatches';
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

type AffluenceQueryRow = SupportedMatchQueryRow & {
  NBSPECT: number;
};

/** Rencontres du club supporte classees par affluence decroissante (huis clos exclus, MATCH.HUIS_CLOS = 1). */
export async function getAffluence(scope?: number | null): Promise<AffluenceRow[]> {
  const supportedClubId = getSupportedClubIdFromEnv();

  const rows = await dbAll<AffluenceQueryRow>(
    `${supportedMatchesSql({
      extraSelect: ['m.NBSPECT AS NBSPECT'],
      matchJoin: 'INNER',
      extraWhere: 'AND COALESCE(m.HUIS_CLOS, 0) = 0',
      scope,
    })}
     ORDER BY m.NBSPECT DESC, DATE DESC`,
    [supportedClubId, supportedClubId, ...(scope != null ? [scope] : [])],
  );

  const context = { supportedClubId, circ: await buildCircCompletResolver(rows), latestTerrainName: createLatestTerrainNameResolver() };

  return rows.map((row) => ({
    ...mapSupportedMatchRow(row, context),
    NBSPECT: Number(row.NBSPECT ?? 0),
  }));
}
