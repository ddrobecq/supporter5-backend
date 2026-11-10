import type { Request } from 'express';
import { dataHandler } from '../../lib/responseHelpers';
import { AppError } from '../../types';
import { getSaisonClassement, getSaisonsDisponibles, type SaisonClassementMetric } from '../../services/stats/saison/classements.service';
import { getEquipeType } from '../../services/stats/saison/equipeType.service';
import { getSaisonComposition, type CompositionMetric } from '../../services/stats/saison/composition.service';
import { getLignesEvolution } from '../../services/stats/saison/schemaEvolution.service';
import { getSaisonButsEquipe, type ButsEquipeMetric } from '../../services/stats/saison/butsEquipe.service';
import { getSaisonSanctionsEquipe, type SanctionEquipeMetric } from '../../services/stats/saison/sanctionsEquipe.service';
import { getSaisonTransferts, type TransfertEquipeMetric } from '../../services/stats/saison/transfertsEquipe.service';

/** Required `saison` query parameter (trimmed), or AppError 400. */
function requireSaison(req: Request): string {
  const saison = String(req.query.saison ?? '').trim();
  if (!saison) {
    throw new AppError(400, 'Le parametre saison est requis.');
  }
  return saison;
}

export const getSaisonsStat = dataHandler(() => getSaisonsDisponibles());

function classementHandler(metric: SaisonClassementMetric) {
  return dataHandler((req) => getSaisonClassement(metric, requireSaison(req)));
}

export const getSaisonTempsStat = classementHandler('temps');
export const getSaisonButsStat = classementHandler('buts');
export const getSaisonPassesStat = classementHandler('passes');
export const getSaisonSanctionsStat = classementHandler('sanctions');

export const getSaisonEquipeTypeStat = dataHandler((req) => getEquipeType(requireSaison(req)));

function compositionHandler(metric: CompositionMetric) {
  return dataHandler(() => getSaisonComposition(metric));
}

export const getSaisonNombreJoueursStat = compositionHandler('nombre-joueurs');
export const getSaisonNombreEtrangersStat = compositionHandler('nombre-etrangers');
export const getSaisonNombreNationalitesStat = compositionHandler('nombre-nationalites');
export const getSaisonAgeMoyenStat = compositionHandler('age-moyen');
export const getSaisonNombreMatchesStat = compositionHandler('nombre-matches');
export const getSaisonNombreRemplacementsStat = compositionHandler('nombre-remplacements');

export const getSaisonSchemaEvolutionStat = dataHandler(() => getLignesEvolution());

function butsEquipeHandler(metric: ButsEquipeMetric) {
  return dataHandler(() => getSaisonButsEquipe(metric));
}

export const getSaisonButsPourStat = butsEquipeHandler('buts-pour');
export const getSaisonButsContreStat = butsEquipeHandler('buts-contre');
export const getSaisonButsPourMatchStat = butsEquipeHandler('buts-pour-match');
export const getSaisonButsContreMatchStat = butsEquipeHandler('buts-contre-match');
export const getSaisonButsMatchStat = butsEquipeHandler('buts-match');

function sanctionsEquipeHandler(metric: SanctionEquipeMetric) {
  return dataHandler(() => getSaisonSanctionsEquipe(metric));
}

export const getSaisonAvertissementsEquipeStat = sanctionsEquipeHandler('avertissements');
export const getSaisonExclusionsEquipeStat = sanctionsEquipeHandler('exclusions');
export const getSaisonAvertissementsMatchStat = sanctionsEquipeHandler('avertissements-match');
export const getSaisonExclusionsMatchStat = sanctionsEquipeHandler('exclusions-match');

function transfertsEquipeHandler(metric: TransfertEquipeMetric) {
  return dataHandler(() => getSaisonTransferts(metric));
}

export const getSaisonAchatsCumulesStat = transfertsEquipeHandler('achats-cumules');
export const getSaisonVentesCumuleesStat = transfertsEquipeHandler('ventes-cumulees');
