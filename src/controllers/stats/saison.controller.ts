import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../types';
import { getSaisonClassement, getSaisonsDisponibles, type SaisonClassementMetric } from '../../services/stats/saison/classements.service';
import { getEquipeType } from '../../services/stats/saison/equipeType.service';

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
