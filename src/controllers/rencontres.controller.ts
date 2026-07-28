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

export async function getRencontreDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const id = String(req.params.id ?? '').trim();
		if (!id) {
			throw new AppError(400, 'Identifiant de rencontre invalide.');
		}

		const data = await rencontresService.getRencontreDetailById(id);
		if (!data) {
			throw new AppError(404, 'Rencontre introuvable.');
		}

		res.status(200).json(data);
	} catch (error) {
		next(error);
	}
}

export async function createWithImpact(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const item = await rencontresService.createWithImpact(req.body as Record<string, unknown>);
		res.status(201).json(item);
	} catch (error) {
		next(error);
	}
}

export async function updateWithImpact(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const item = await rencontresService.updateWithImpact(req.params.id, req.body as Record<string, unknown>);
		if (!item) {
			throw new AppError(404, 'Rencontre introuvable.');
		}

		res.status(200).json(item);
	} catch (error) {
		next(error);
	}
}

export async function removeWithImpact(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const deleted = await rencontresService.removeWithImpact(req.params.id);
		if (!deleted) {
			throw new AppError(404, 'Rencontre introuvable.');
		}

		res.status(204).send();
	} catch (error) {
		next(error);
	}
}

export default {
	...baseController,
	createWithImpact,
	updateWithImpact,
	removeWithImpact,
};
