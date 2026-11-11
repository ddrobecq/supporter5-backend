import { dbAll } from '../../../config/database';
import { buildCircCompletResolver } from '../../../lib/circComplet';
import { createLatestTerrainNameResolver, mapSupportedMatchRow, supportedMatchesSql, type SupportedMatchQueryRow } from '../../../lib/supportedMatches';
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

type SanctionQueryRow = SupportedMatchQueryRow & {
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
      ${supportedMatchesSql({
        extraSelect: [`(SELECT COUNT(*) FROM EVENT ev WHERE ev.MACLEUNIK = m.MACLEUNIK AND ev.TYPE_EVENT IN ${METRIC_TYPE_EVENT[metric]}) AS NB_SANCTIONS`],
        matchJoin: 'INNER',
        scope,
      })}
    )
    SELECT * FROM rencontres
    WHERE NB_SANCTIONS > 0
    ORDER BY NB_SANCTIONS DESC, DATE DESC`,
    [supportedClubId, supportedClubId, ...(scope != null ? [scope] : [])],
  );

  const context = { supportedClubId, circ: await buildCircCompletResolver(rows), latestTerrainName: createLatestTerrainNameResolver() };

  return rows.map((row) => ({
    ...mapSupportedMatchRow(row, context),
    NB_SANCTIONS: Number(row.NB_SANCTIONS ?? 0),
  }));
}
