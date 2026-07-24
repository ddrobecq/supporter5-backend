import { createEntityController } from '../lib/controllerFactory';
import { parseSuggestQuery } from '../lib/requestQuery';
import epreuveService from '../services/epreuve.service';
import type { NextFunction, Request, Response } from 'express';

const baseController = createEntityController(epreuveService);

export async function getEpreuveSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { search, limit } = parseSuggestQuery(req);
		const result = await epreuveService.getEpreuveSuggestions(search, limit);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function createEpreuveWithWizard(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const created = await epreuveService.createEpreuveWithWizard(req.body as { name: string });
		res.status(201).json(created);
	} catch (error) {
		next(error);
	}
}

export default baseController;