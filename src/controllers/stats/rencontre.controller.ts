import type { NextFunction, Request, Response } from 'express';
import { getAffluence } from '../../services/stats/rencontre/affluence.service';
import { parseScopeParam } from '../../lib/matchScopeFilter';
import { getScores, type ScoreMetric } from '../../services/stats/rencontre/scores.service';
import { getRencontreSanctions, type SanctionMetric } from '../../services/stats/rencontre/sanctions.service';
import { getRencontreSeries, type RencontreSerieMetric } from '../../services/stats/rencontre/series.service';

function scoreHandler(metric: ScoreMetric) {
  return async function handler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await getScores(metric, parseScopeParam(req.query.scope));
      res.status(200).json({ data });
    } catch (error) { next(error); }
  };
}

export const getScoresVictoiresStat = scoreHandler('victoires');
export const getScoresDefaitesStat = scoreHandler('defaites');
export const getScoresProlifiquesStat = scoreHandler('prolifiques');

export async function getAffluenceStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getAffluence(parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

function sanctionHandler(metric: SanctionMetric) {
  return async function handler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await getRencontreSanctions(metric, parseScopeParam(req.query.scope));
      res.status(200).json({ data });
    } catch (error) { next(error); }
  };
}

export const getSanctionsAvertissementsStat = sanctionHandler('avertissements');
export const getSanctionsExclusionsStat = sanctionHandler('exclusions');

function serieHandler(metric: RencontreSerieMetric) {
  return async function handler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await getRencontreSeries(metric, parseScopeParam(req.query.scope));
      res.status(200).json({ data });
    } catch (error) { next(error); }
  };
}

export const getSeriesVictoiresStat = serieHandler('victoires');
export const getSeriesNulsStat = serieHandler('nuls');
export const getSeriesDefaitesStat = serieHandler('defaites');
export const getSeriesInvincibiliteStat = serieHandler('invincibilite');
export const getSeriesInviolabiliteStat = serieHandler('inviolabilite');
export const getSeriesInefficaciteStat = serieHandler('inefficacite');
