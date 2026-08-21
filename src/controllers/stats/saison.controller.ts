import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../types';
import { getSaisonClassement, getSaisonsDisponibles, type SaisonClassementMetric } from '../../services/stats/saison/classements.service';
import { getEquipeType } from '../../services/stats/saison/equipeType.service';
import { getSaisonComposition, type CompositionMetric } from '../../services/stats/saison/composition.service';
import { getLignesEvolution } from '../../services/stats/saison/schemaEvolution.service';
import { getSaisonButsEquipe, type ButsEquipeMetric } from '../../services/stats/saison/butsEquipe.service';
import { getSaisonSanctionsEquipe, type SanctionEquipeMetric } from '../../services/stats/saison/sanctionsEquipe.service';
import { getSaisonTransferts, type TransfertEquipeMetric } from '../../services/stats/saison/transfertsEquipe.service';

export async function getSaisonsStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSaisonsDisponibles();
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

function classementHandler(metric: SaisonClassementMetric) {
  return async function handler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const saison = String(req.query.saison ?? '').trim();
      if (!saison) {
        throw new AppError(400, 'Le parametre saison est requis.');
      }
      const data = await getSaisonClassement(metric, saison);
      res.status(200).json({ data });
    } catch (error) { next(error); }
  };
}

export const getSaisonTempsStat = classementHandler('temps');
export const getSaisonButsStat = classementHandler('buts');
export const getSaisonPassesStat = classementHandler('passes');
export const getSaisonSanctionsStat = classementHandler('sanctions');

export async function getSaisonEquipeTypeStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const saison = String(req.query.saison ?? '').trim();
    if (!saison) {
      throw new AppError(400, 'Le parametre saison est requis.');
    }
    const data = await getEquipeType(saison);
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

function compositionHandler(metric: CompositionMetric) {
  return async function handler(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await getSaisonComposition(metric);
      res.status(200).json({ data });
    } catch (error) { next(error); }
  };
}

export const getSaisonNombreJoueursStat = compositionHandler('nombre-joueurs');
export const getSaisonNombreEtrangersStat = compositionHandler('nombre-etrangers');
export const getSaisonNombreNationalitesStat = compositionHandler('nombre-nationalites');
export const getSaisonAgeMoyenStat = compositionHandler('age-moyen');
export const getSaisonNombreMatchesStat = compositionHandler('nombre-matches');
export const getSaisonNombreRemplacementsStat = compositionHandler('nombre-remplacements');

export async function getSaisonSchemaEvolutionStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getLignesEvolution();
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

function butsEquipeHandler(metric: ButsEquipeMetric) {
  return async function handler(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await getSaisonButsEquipe(metric);
      res.status(200).json({ data });
    } catch (error) { next(error); }
  };
}

export const getSaisonButsPourStat = butsEquipeHandler('buts-pour');
export const getSaisonButsContreStat = butsEquipeHandler('buts-contre');
export const getSaisonButsPourMatchStat = butsEquipeHandler('buts-pour-match');
export const getSaisonButsContreMatchStat = butsEquipeHandler('buts-contre-match');
export const getSaisonButsMatchStat = butsEquipeHandler('buts-match');

function sanctionsEquipeHandler(metric: SanctionEquipeMetric) {
  return async function handler(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await getSaisonSanctionsEquipe(metric);
      res.status(200).json({ data });
    } catch (error) { next(error); }
  };
}

export const getSaisonAvertissementsEquipeStat = sanctionsEquipeHandler('avertissements');
export const getSaisonExclusionsEquipeStat = sanctionsEquipeHandler('exclusions');
export const getSaisonAvertissementsMatchStat = sanctionsEquipeHandler('avertissements-match');
export const getSaisonExclusionsMatchStat = sanctionsEquipeHandler('exclusions-match');

function transfertsEquipeHandler(metric: TransfertEquipeMetric) {
  return async function handler(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await getSaisonTransferts(metric);
      res.status(200).json({ data });
    } catch (error) { next(error); }
  };
}

export const getSaisonAchatsCumulesStat = transfertsEquipeHandler('achats-cumules');
export const getSaisonVentesCumuleesStat = transfertsEquipeHandler('ventes-cumulees');