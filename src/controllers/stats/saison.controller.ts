import type { Request } from 'express';
import { cachedDataHandler } from '../../lib/statsCache';
import { requireText } from '../../lib/coerce';
import { normalizeSaison } from '../../lib/saisonRules';
import { getSaisonClassement, getSaisonsDisponibles, type SaisonClassementMetric } from '../../services/stats/saison/classements.service';
import { getEquipeType } from '../../services/stats/saison/equipeType.service';
import { getSaisonComposition, type CompositionMetric } from '../../services/stats/saison/composition.service';
import { getLignesEvolution } from '../../services/stats/saison/schemaEvolution.service';
import { getSaisonButsEquipe, type ButsEquipeMetric } from '../../services/stats/saison/butsEquipe.service';
import { getSaisonSanctionsEquipe, type SanctionEquipeMetric } from '../../services/stats/saison/sanctionsEquipe.service';
import { getSaisonTransferts, type TransfertEquipeMetric } from '../../services/stats/saison/transfertsEquipe.service';

/** Required `saison` query parameter (trimmed, xxxx-yyyy), or AppError 400. */
function requireSaison(req: Request): string {
  return normalizeSaison(requireText(req.query.saison, 'Le parametre saison est requis.'));
}

export const getSaisonsStat = cachedDataHandler(() => getSaisonsDisponibles());

function classementHandler(metric: SaisonClassementMetric) {
  return cachedDataHandler((req) => getSaisonClassement(metric, requireSaison(req)));
}

export const getSaisonTempsStat = classementHandler('temps');
export const getSaisonButsStat = classementHandler('buts');
export const getSaisonPassesStat = classementHandler('passes');
export const getSaisonSanctionsStat = classementHandler('sanctions');

export const getSaisonEquipeTypeStat = cachedDataHandler((req) => getEquipeType(requireSaison(req)));

function compositionHandler(metric: CompositionMetric) {
  return cachedDataHandler(() => getSaisonComposition(metric));
}

export const getSaisonNombreJoueursStat = compositionHandler('nombre-joueurs');
export const getSaisonNombreEtrangersStat = compositionHandler('nombre-etrangers');
export const getSaisonNombreNationalitesStat = compositionHandler('nombre-nationalites');
export const getSaisonAgeMoyenStat = compositionHandler('age-moyen');
export const getSaisonNombreMatchesStat = compositionHandler('nombre-matches');
export const getSaisonNombreRemplacementsStat = compositionHandler('nombre-remplacements');

export const getSaisonSchemaEvolutionStat = cachedDataHandler(() => getLignesEvolution());

function butsEquipeHandler(metric: ButsEquipeMetric) {
  return cachedDataHandler(() => getSaisonButsEquipe(metric));
}

export const getSaisonButsPourStat = butsEquipeHandler('buts-pour');
export const getSaisonButsContreStat = butsEquipeHandler('buts-contre');
export const getSaisonButsPourMatchStat = butsEquipeHandler('buts-pour-match');
export const getSaisonButsContreMatchStat = butsEquipeHandler('buts-contre-match');
export const getSaisonButsMatchStat = butsEquipeHandler('buts-match');

function sanctionsEquipeHandler(metric: SanctionEquipeMetric) {
  return cachedDataHandler(() => getSaisonSanctionsEquipe(metric));
}

export const getSaisonAvertissementsEquipeStat = sanctionsEquipeHandler('avertissements');
export const getSaisonExclusionsEquipeStat = sanctionsEquipeHandler('exclusions');
export const getSaisonAvertissementsMatchStat = sanctionsEquipeHandler('avertissements-match');
export const getSaisonExclusionsMatchStat = sanctionsEquipeHandler('exclusions-match');

function transfertsEquipeHandler(metric: TransfertEquipeMetric) {
  return cachedDataHandler(() => getSaisonTransferts(metric));
}

export const getSaisonAchatsCumulesStat = transfertsEquipeHandler('achats-cumules');
export const getSaisonVentesCumuleesStat = transfertsEquipeHandler('ventes-cumulees');
