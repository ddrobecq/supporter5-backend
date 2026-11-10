import type { Request } from 'express';
import { parseScopeParam } from '../../lib/matchScopeFilter';
import { dataHandler } from '../../lib/responseHelpers';
import { getButeurs, getButeursParMatch, getButeursParSaison, getButsMultiplesParJoueur, getDernierMatch, getEfficaciteButeurs, getExclusionsRapides, getMeilleursGardiens, getNombreAnneesAuClub, getParSaison, getPerformances, getPhysique, getPlusSelectionnes, getPremierMatch, getSanctions, getSanctionsParSaison, getSeriesButeurs, getSeriesInviolabilite, getTransferts, type PhysiqueMetric, type TransfertMetric } from '../../services/stats/joueur/apparitions.service';
import { getEquipeType } from '../../services/stats/saison/equipeType.service';

const scopeOf = (req: Request) => parseScopeParam(req.query.scope);

export const getApparitionsPlusSelectionnes = dataHandler(() => getPlusSelectionnes());

export const getApparitionsParSaison = dataHandler(() => getParSaison());

/** Equipe type historique: memes calculs que Saison/Performance/Equipe type mais toutes saisons confondues. */
export const getApparitionsEquipeType = dataHandler(() => getEquipeType());

export const getPassesStat = dataHandler(() => getButeurs('passes'));

export const getPassesParSaisonStat = dataHandler(() => getButeursParSaison('passes'));

export const getAvertissementsStat = dataHandler(() => getSanctions('avertissements'));

export const getAvertissementsParSaisonStat = dataHandler(() => getSanctionsParSaison('avertissements'));

export const getExclusionsStat = dataHandler(() => getSanctions('exclusions'));

export const getExclusionsParSaisonStat = dataHandler(() => getSanctionsParSaison('exclusions'));

export const getExclusionsRapidesStat = dataHandler((req) => getExclusionsRapides(scopeOf(req)));

export const getMeilleursGardiensStat = dataHandler((req) => getMeilleursGardiens(scopeOf(req)));

export const getSeriesInviolabiliteStat = dataHandler((req) => getSeriesInviolabilite(scopeOf(req)));

export const getVictoiresStat = dataHandler((req) => getPerformances('victoires', scopeOf(req)));

export const getNulsStat = dataHandler((req) => getPerformances('nuls', scopeOf(req)));

export const getDefaitesStat = dataHandler((req) => getPerformances('defaites', scopeOf(req)));

function transfertHandler(metric: TransfertMetric) {
  return dataHandler(() => getTransferts(metric));
}

export const getAchatsStat = transfertHandler('achats');
export const getVentesStat = transfertHandler('ventes');
export const getPlusValuesStat = transfertHandler('plus-values');
export const getMoinsValuesStat = transfertHandler('moins-values');

function physiqueHandler(metric: PhysiqueMetric) {
  return dataHandler(() => getPhysique(metric));
}

export const getGrandsStat = physiqueHandler('grands');
export const getPetitsStat = physiqueHandler('petits');
export const getGabaritsStat = physiqueHandler('gabarits');

export const getButeursStat = dataHandler(() => getButeurs());

export const getButeursParSaisonStat = dataHandler(() => getButeursParSaison());

export const getButeursParMatchStat = dataHandler((req) => getButeursParMatch('buts', scopeOf(req)));

export const getPassesParMatchStat = dataHandler((req) => getButeursParMatch('passes', scopeOf(req)));

function butsMultiplesHandler(metric: 'buts' | 'passes', minButs: number) {
  return dataHandler((req) => getButsMultiplesParJoueur(metric, minButs, scopeOf(req)));
}

export const getDoublesStat = butsMultiplesHandler('buts', 2);
export const getTriplesStat = butsMultiplesHandler('buts', 3);
export const getQuadruplesStat = butsMultiplesHandler('buts', 4);
export const getPassesDoublesStat = butsMultiplesHandler('passes', 2);
export const getPassesTriplesStat = butsMultiplesHandler('passes', 3);

export const getEfficaciteButeursStat = dataHandler(() => getEfficaciteButeurs());

export const getEfficacitePassesStat = dataHandler(() => getEfficaciteButeurs('passes'));

export const getSeriesButeursStat = dataHandler((req) => getSeriesButeurs('buts', scopeOf(req)));

export const getSeriesPassesStat = dataHandler((req) => getSeriesButeurs('passes', scopeOf(req)));

export const getNombreAnneesAuClubStat = dataHandler((req) => {
  const playerOnly = String(req.query.playerOnly ?? '').toLowerCase() === 'true';
  return getNombreAnneesAuClub(playerOnly);
});

export const getPremierMatchStat = dataHandler((req) => getPremierMatch('ASC', scopeOf(req)));

export const getDernierMatchStat = dataHandler((req) => getDernierMatch(scopeOf(req)));
