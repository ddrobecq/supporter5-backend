import { createEntityController } from '../lib/controllerFactory';
import toursService from '../services/tours.service';
import type { NextFunction, Request, Response } from 'express';

const baseController = createEntityController(toursService);

export async function getToursByCompetition(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await toursService.getToursByCompetition(req.params.competitionId);
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export async function getTourByIdDetailed(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const row = await toursService.getTourByIdDetailed(req.params.id);
		if (!row) {
			res.status(404).json({ message: 'Not found' });
			return;
		}
		res.status(200).json(row);
	} catch (error) {
		next(error);
	}
}

export async function moveTour(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const direction = req.body?.direction === 'down' ? 'down' : 'up';
		const data = await toursService.moveTour(req.params.id, direction);
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export async function removeTour(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const removed = await toursService.removeTourWithResequence(req.params.id);
		if (!removed) {
			res.status(404).json({ message: 'Not found' });
			return;
		}
		res.status(204).send();
	} catch (error) {
		next(error);
	}
}

export default {
	...baseController,
};
