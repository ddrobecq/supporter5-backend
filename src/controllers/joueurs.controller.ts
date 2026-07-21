import { createEntityController } from '../lib/controllerFactory';
import joueursService from '../services/joueurs.service';
import { AppError } from '../types';
import type { NextFunction, Request, Response } from 'express';

const baseController = createEntityController(joueursService);

export async function getJoueursGrid(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const season = String(req.query.season ?? '').trim();
		if (!/^\d{4}-\d{4}$/.test(season)) {
			throw new AppError(400, 'Parametre season invalide (xxxx-yyyy attendu)');
		}

		const search = String(req.query.search ?? '').trim();
		const data = await joueursService.getJoueursGridBySeason(season, search);
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}
export default baseController;
