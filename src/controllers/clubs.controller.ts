import { createEntityController } from '../lib/controllerFactory';
import clubsService from '../services/clubs.service';
import type { NextFunction, Request, Response } from 'express';

const baseController = createEntityController(clubsService);

export async function getClubsGrid(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const search = String(req.query.search ?? '').trim();
		const rawPage = Number(req.query.page ?? 1);
		const rawLimit = Number(req.query.limit ?? 100);
		const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
		const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 200) : 100;
		const result = await clubsService.getClubsGrid(search, page, limit);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export default baseController;
