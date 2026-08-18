import type { NextFunction, Request, Response } from 'express';
import { getButeurs, getButeursParMatch, getButeursParSaison, getDernierMatch, getEfficaciteButeurs, getExclusionsRapides, getMeilleursGardiens, getNombreAnneesAuClub, getParSaison, getPlusSelectionnes, getPremierMatch, getSanctions, getSanctionsParSaison, getSeriesButeurs, getSeriesInviolabilite } from '../../services/stats/joueur/apparitions.service';

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

export async function getExclusionsRapidesStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getExclusionsRapides();
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

export async function getMeilleursGardiensStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getMeilleursGardiens();
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

export async function getSeriesInviolabiliteStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSeriesInviolabilite();
    res.status(200).json({ data });
  } catch (error) { next(error); }
}

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

export async function getButeursParMatchStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getButeursParMatch();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getPassesParMatchStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getButeursParMatch('passes');
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

export async function getSeriesButeursStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSeriesButeurs();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getSeriesPassesStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSeriesButeurs('passes');
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

export async function getPremierMatchStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getPremierMatch();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}

export async function getDernierMatchStat(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getDernierMatch();
    res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
}
