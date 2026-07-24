import { createEntityController } from '../lib/controllerFactory';
import { parseSuggestQuery } from '../lib/requestQuery';
import arbitreService from '../services/arbitre.service';
import type { NextFunction, Request, Response } from 'express';

const baseController = createEntityController(arbitreService);

export async function getArbitreSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { search, limit } = parseSuggestQuery(req);
		const result = await arbitreService.getArbitreSuggestions(search, limit);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function createArbitreWithWizard(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const created = await arbitreService.createArbitreWithWizard(req.body as { nom: string; prenom?: string; natioId: string });
		res.status(201).json(created);
	} catch (error) {
		next(error);
	}
}

export default baseController;
