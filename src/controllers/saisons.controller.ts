import { createEntityController } from '../lib/controllerFactory';
import saisonsService from '../services/saisons.service';
import type { NextFunction, Request, Response } from 'express';

const baseController = createEntityController(saisonsService);

export async function createSaisonWithWizard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const created = await saisonsService.createSaisonWithWizard(req.body as {
      saison: string;
      saDebut: string;
      saFin: string;
      joueurs?: Array<{ idJoueur: string; poste: number | string }>;
      competitions?: Array<{ competitionId: number | string; idem: boolean }>;
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export default baseController;
