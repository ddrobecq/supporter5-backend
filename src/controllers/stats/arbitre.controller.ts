import { parseScopeParam } from '../../lib/matchScopeFilter';
import { cachedDataHandler } from '../../lib/statsCache';
import { getArbitreMatches } from '../../services/stats/arbitre/matches.service';
import { getArbitreSanctions, type ArbitreSanctionMetric } from '../../services/stats/arbitre/sanctions.service';

export const getArbitreMatchesStat = cachedDataHandler((req) => getArbitreMatches(parseScopeParam(req.query.scope)));

function sanctionHandler(metric: ArbitreSanctionMetric) {
  return cachedDataHandler((req) => getArbitreSanctions(metric, parseScopeParam(req.query.scope)));
}

export const getArbitreAvertissementsStat = sanctionHandler('avertissements');
export const getArbitreExclusionsStat = sanctionHandler('exclusions');
