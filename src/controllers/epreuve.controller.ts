import { createEntityController } from '../lib/controllerFactory';
import epreuveService from '../services/epreuve.service';
import type { NextFunction, Request, Response } from 'express';

const baseController = createEntityController(epreuveService);

export async function getEpreuveSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const search = String(req.query.search ?? '').trim();
		const rawLimit = Number(req.query.limit ?? 12);
		const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 30) : 12;
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