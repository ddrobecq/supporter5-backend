import type { NextFunction, Request, Response } from 'express';
import { parseScopeParam } from '../../lib/matchScopeFilter';
import { getButeurs, getButeursParMatch, getButeursParSaison, getDernierMatch, getEfficaciteButeurs, getExclusionsRapides, getMeilleursGardiens, getNombreAnneesAuClub, getParSaison, getPerformances, getPhysique, getPlusSelectionnes, getPremierMatch, getSanctions, getSanctionsParSaison, getSeriesButeurs, getSeriesInviolabilite, getTransferts, type PhysiqueMetric, type TransfertMetric } from '../../services/stats/joueur/apparitions.service';
import { getEquipeType } from '../../services/stats/saison/equipeType.service';

export async function getApparitionsPlusSelectionnes(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getPlusSelectionnes();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getApparitionsParSaison(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getParSaison();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

/** Equipe type historique: memes calculs que Saison/Performance/Equipe type mais toutes saisons confondues. */
export async function getApparitionsEquipeType(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getEquipeType();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getPassesStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getButeurs('passes');
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getPassesParSaisonStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getButeursParSaison('passes');
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getAvertissementsStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSanctions('avertissements');
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

export async function getAvertissementsParSaisonStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSanctionsParSaison('avertissements');
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

export async function getExclusionsStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSanctions('exclusions');
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

export async function getExclusionsParSaisonStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSanctionsParSaison('exclusions');
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

export async function getExclusionsRapidesStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getExclusionsRapides(parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

export async function getMeilleursGardiensStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getMeilleursGardiens(parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

export async function getSeriesInviolabiliteStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSeriesInviolabilite(parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

export async function getVictoiresStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getPerformances('victoires', parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

export async function getNulsStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getPerformances('nuls', parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

export async function getDefaitesStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getPerformances('defaites', parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

function transfertHandler(metric: TransfertMetric) {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await getTransferts(metric);
      res.status(200).json({ data });
    } catch (error) { next(error); }
  };
}

export const getAchatsStat = transfertHandler('achats');
export const getVentesStat = transfertHandler('ventes');
export const getPlusValuesStat = transfertHandler('plus-values');
export const getMoinsValuesStat = transfertHandler('moins-values');

function physiqueHandler(metric: PhysiqueMetric) {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await getPhysique(metric);
      res.status(200).json({ data });
    } catch (error) { next(error); }
  };
}

export const getGrandsStat = physiqueHandler('grands');
export const getPetitsStat = physiqueHandler('petits');
export const getGabaritsStat = physiqueHandler('gabarits');

export async function getButeursStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getButeurs();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getButeursParSaisonStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getButeursParSaison();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getButeursParMatchStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getButeursParMatch('buts', parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getPassesParMatchStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getButeursParMatch('passes', parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getEfficaciteButeursStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getEfficaciteButeurs();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getEfficacitePassesStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getEfficaciteButeurs('passes');
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getSeriesButeursStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSeriesButeurs('buts', parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getSeriesPassesStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSeriesButeurs('passes', parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getNombreAnneesAuClubStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const playerOnly = String(req.query.playerOnly ?? '').toLowerCase() === 'true';
    const data = await getNombreAnneesAuClub(playerOnly);
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getPremierMatchStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getPremierMatch('ASC', parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getDernierMatchStat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getDernierMatch(parseScopeParam(req.query.scope));
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}
