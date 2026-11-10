import { parseScopeParam } from '../../lib/matchScopeFilter';
import { dataHandler } from '../../lib/responseHelpers';
import { getAffluence } from '../../services/stats/rencontre/affluence.service';
import { getScores, type ScoreMetric } from '../../services/stats/rencontre/scores.service';
import { getRencontreSanctions, type SanctionMetric } from '../../services/stats/rencontre/sanctions.service';
import { getRencontreSeries, type RencontreSerieMetric } from '../../services/stats/rencontre/series.service';

function scoreHandler(metric: ScoreMetric) {
  return dataHandler((req) => getScores(metric, parseScopeParam(req.query.scope)));
}

export const getScoresVictoiresStat = scoreHandler('victoires');
export const getScoresDefaitesStat = scoreHandler('defaites');
export const getScoresProlifiquesStat = scoreHandler('prolifiques');

export const getAffluenceStat = dataHandler((req) => getAffluence(parseScopeParam(req.query.scope)));

function sanctionHandler(metric: SanctionMetric) {
  return dataHandler((req) => getRencontreSanctions(metric, parseScopeParam(req.query.scope)));
}

export const getSanctionsAvertissementsStat = sanctionHandler('avertissements');
export const getSanctionsExclusionsStat = sanctionHandler('exclusions');

function serieHandler(metric: RencontreSerieMetric) {
  return dataHandler((req) => getRencontreSeries(metric, parseScopeParam(req.query.scope)));
}

export const getSeriesVictoiresStat = serieHandler('victoires');
export const getSeriesNulsStat = serieHandler('nuls');
export const getSeriesDefaitesStat = serieHandler('defaites');
export const getSeriesInvincibiliteStat = serieHandler('invincibilite');
export const getSeriesInviolabiliteStat = serieHandler('inviolabilite');
export const getSeriesInefficaciteStat = serieHandler('inefficacite');
