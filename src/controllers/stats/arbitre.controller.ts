import type { NextFunction, Request, Response } from 'express';
import { parseScopeParam } from '../../lib/matchScopeFilter';
import { getArbitreMatches } from '../../services/stats/arbitre/matches.service';
import { getArbitreSanctions, type ArbitreSanctionMetric } from '../../services/stats/arbitre/sanctions.service';

export async function getArbitreMatchesStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getArbitreMatches(parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

function sanctionHandler(metric: ArbitreSanctionMetric) {
  return async function handler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await getArbitreSanctions(metric, parseScopeParam(req.query.scope));
      res.status(200).json({ data });
    } catch (error) { next(error); }
  };
}

export const getArbitreAvertissementsStat = sanctionHandler('avertissements');
export const getArbitreExclusionsStat = sanctionHandler('exclusions');
