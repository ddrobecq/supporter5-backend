import type { Request } from 'express';
import { parseScopeParam } from '../../lib/matchScopeFilter';
import { cachedDataHandler } from '../../lib/statsCache';
import { getButeurs, getButeursParMatch, getButeursParSaison, getButsMultiplesParJoueur, getDernierMatch, getEfficaciteButeurs, getExclusionsRapides, getMeilleursGardiens, getNombreAnneesAuClub, getParSaison, getPerformances, getPhysique, getPlusSelectionnes, getPremierMatch, getSanctions, getSanctionsParSaison, getSeriesButeurs, getSeriesInviolabilite, getTransferts, type PhysiqueMetric, type TransfertMetric } from '../../services/stats/joueur/apparitions.service';
import { getEquipeType } from '../../services/stats/saison/equipeType.service';

const scopeOf = (req: Request) => parseScopeParam(req.query.scope);

export const getApparitionsPlusSelectionnes = cachedDataHandler(() => getPlusSelectionnes());

export const getApparitionsParSaison = cachedDataHandler(() => getParSaison());

/** Equipe type historique: memes calculs que Saison/Performance/Equipe type mais toutes saisons confondues. */
export const getApparitionsEquipeType = cachedDataHandler(() => getEquipeType());

export const getPassesStat = cachedDataHandler(() => getButeurs('passes'));

export const getPassesParSaisonStat = cachedDataHandler(() => getButeursParSaison('passes'));

export const getAvertissementsStat = cachedDataHandler(() => getSanctions('avertissements'));

export const getAvertissementsParSaisonStat = cachedDataHandler(() => getSanctionsParSaison('avertissements'));

export const getExclusionsStat = cachedDataHandler(() => getSanctions('exclusions'));

export const getExclusionsParSaisonStat = cachedDataHandler(() => getSanctionsParSaison('exclusions'));

export const getExclusionsRapidesStat = cachedDataHandler((req) => getExclusionsRapides(scopeOf(req)));

export const getMeilleursGardiensStat = cachedDataHandler((req) => getMeilleursGardiens(scopeOf(req)));

export const getSeriesInviolabiliteStat = cachedDataHandler((req) => getSeriesInviolabilite(scopeOf(req)));

export const getVictoiresStat = cachedDataHandler((req) => getPerformances('victoires', scopeOf(req)));

export const getNulsStat = cachedDataHandler((req) => getPerformances('nuls', scopeOf(req)));

export const getDefaitesStat = cachedDataHandler((req) => getPerformances('defaites', scopeOf(req)));

function transfertHandler(metric: TransfertMetric) {
  return cachedDataHandler(() => getTransferts(metric));
}

export const getAchatsStat = transfertHandler('achats');
export const getVentesStat = transfertHandler('ventes');
export const getPlusValuesStat = transfertHandler('plus-values');
export const getMoinsValuesStat = transfertHandler('moins-values');

function physiqueHandler(metric: PhysiqueMetric) {
  return cachedDataHandler(() => getPhysique(metric));
}

export const getGrandsStat = physiqueHandler('grands');
export const getPetitsStat = physiqueHandler('petits');
export const getGabaritsStat = physiqueHandler('gabarits');

export const getButeursStat = cachedDataHandler(() => getButeurs());

export const getButeursParSaisonStat = cachedDataHandler(() => getButeursParSaison());

export const getButeursParMatchStat = cachedDataHandler((req) => getButeursParMatch('buts', scopeOf(req)));

export const getPassesParMatchStat = cachedDataHandler((req) => getButeursParMatch('passes', scopeOf(req)));

function butsMultiplesHandler(metric: 'buts' | 'passes', minButs: number) {
  return cachedDataHandler((req) => getButsMultiplesParJoueur(metric, minButs, scopeOf(req)));
}

export const getDoublesStat = butsMultiplesHandler('buts', 2);
export const getTriplesStat = butsMultiplesHandler('buts', 3);
export const getQuadruplesStat = butsMultiplesHandler('buts', 4);
export const getPassesDoublesStat = butsMultiplesHandler('passes', 2);
export const getPassesTriplesStat = butsMultiplesHandler('passes', 3);

export const getEfficaciteButeursStat = cachedDataHandler(() => getEfficaciteButeurs());

export const getEfficacitePassesStat = cachedDataHandler(() => getEfficaciteButeurs('passes'));

export const getSeriesButeursStat = cachedDataHandler((req) => getSeriesButeurs('buts', scopeOf(req)));

export const getSeriesPassesStat = cachedDataHandler((req) => getSeriesButeurs('passes', scopeOf(req)));

export const getNombreAnneesAuClubStat = cachedDataHandler((req) => {
  const playerOnly = String(req.query.playerOnly ?? '').toLowerCase() === 'true';
  return getNombreAnneesAuClub(playerOnly);
});

export const getPremierMatchStat = cachedDataHandler((req) => getPremierMatch('ASC', scopeOf(req)));

export const getDernierMatchStat = cachedDataHandler((req) => getDernierMatch(scopeOf(req)));
