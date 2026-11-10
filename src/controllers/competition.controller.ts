import { createEntityController } from '../lib/controllerFactory';
import { checkCompetitionIntegrity } from '../lib/integrityChecker';
import competitionService from '../services/competition.service';
import type { NextFunction, Request, Response } from 'express';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = checkCompetitionIntegrity;

const baseController = createEntityController(competitionService, { integrityChecker });

export async function createCompetitionWithWizard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const created = await competitionService.createCompetitionWithWizard(req.body as {
      epreuveId: string | number;
      saison: string;
      name?: string;
      sameAsLastEdition?: boolean;
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export default baseController;
