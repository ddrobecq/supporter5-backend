import { dbAll } from '../../../config/database';
import { scopeFilterClause, scopeFilterJoins } from '../../../lib/matchScopeFilter';

export interface ArbitreMatchesRow {
  IDARBITRE: string;
  NOM: string;
  PRENOM: string;
  IDNATIO: string | null;
  MATCHES: number;
}

/** Classement des arbitres par nombre decroissant de matchs officiels arbitres. */
export async function getArbitreMatches(scope?: number | null): Promise<ArbitreMatchesRow[]> {
  return dbAll<ArbitreMatchesRow>(
    `SELECT
       a.IDARBITRE,
       a.NOM,
       a.PRENOM,
       a.IDNATIO,
       COUNT(*) AS MATCHES
     FROM MATCH m
     INNER JOIN RENCO r ON r.RECLEUNIK = m.RECLEUNIK
     INNER JOIN ARBITRE a ON a.IDARBITRE = m.IDARBITRE
     ${scopeFilterJoins('r')}
     WHERE COALESCE(r.TUCLEUNIK, 0) <> 0
       ${scopeFilterClause(scope)}
     GROUP BY a.IDARBITRE, a.NOM, a.PRENOM, a.IDNATIO
     ORDER BY MATCHES DESC, a.NOM ASC, a.PRENOM ASC`,
    scope != null ? [scope] : [],
  );
}
