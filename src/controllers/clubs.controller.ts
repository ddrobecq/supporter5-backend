import { createEntityController } from '../lib/controllerFactory';
import clubsService from '../services/clubs.service';
import type { NextFunction, Request, Response } from 'express';

const baseController = createEntityController(clubsService);

export async function getClubsGrid(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const search = String(req.query.search ?? '').trim();
		const data = await clubsService.getClubsGrid(search);
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export default baseController;
