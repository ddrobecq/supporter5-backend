import { dbAll } from '../../../config/database';
import { scopeFilterClause, scopeFilterJoins } from '../../../lib/matchScopeFilter';

export type ArbitreSanctionMetric = 'avertissements' | 'exclusions';

export interface ArbitreSanctionRow {
  IDARBITRE: string;
  NOM: string;
  PRENOM: string;
  IDNATIO: string | null;
  TOTAL: number;
}

const METRIC_TYPE_EVENT: Record<ArbitreSanctionMetric, string> = {
  avertissements: '(3, 4)',
  exclusions: '(5)',
};

/** Classement des arbitres par nombre decroissant de cartons donnes (avertissements TYPE_EVENT 3/4, exclusions 5). */
export async function getArbitreSanctions(metric: ArbitreSanctionMetric, scope?: number | null): Promise<ArbitreSanctionRow[]> {
  return dbAll<ArbitreSanctionRow>(
    `SELECT
       a.IDARBITRE,
       a.NOM,
       a.PRENOM,
       a.IDNATIO,
       COUNT(*) AS TOTAL
     FROM EVENT e
     INNER JOIN MATCH m ON m.MACLEUNIK = e.MACLEUNIK
     INNER JOIN RENCO r ON r.RECLEUNIK = m.RECLEUNIK
     INNER JOIN ARBITRE a ON a.IDARBITRE = m.IDARBITRE
     ${scopeFilterJoins('r')}
     WHERE COALESCE(r.TUCLEUNIK, 0) <> 0
       AND e.TYPE_EVENT IN ${METRIC_TYPE_EVENT[metric]}
       ${scopeFilterClause(scope)}
     GROUP BY a.IDARBITRE, a.NOM, a.PRENOM, a.IDNATIO
     ORDER BY TOTAL DESC, a.NOM ASC, a.PRENOM ASC`,
    scope != null ? [scope] : [],
  );
}
