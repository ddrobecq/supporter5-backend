import { createEntityController } from '../lib/controllerFactory';
import rencontresService from '../services/rencontres.service';
import { AppError } from '../types';
import type { Request, Response, NextFunction } from 'express';

const baseController = createEntityController(rencontresService);

export async function getCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const date = String(req.query.date ?? '').trim();
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			throw new AppError(400, 'Paramètre date invalide (YYYY-MM-DD attendu)');
		}

		const data = await rencontresService.getCalendarByDate(date);
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export default baseController;
