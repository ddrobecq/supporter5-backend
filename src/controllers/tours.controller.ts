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

export async function getTourParticipants(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await toursService.getTourParticipants(req.params.id);
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export async function addTourParticipant(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const clubId = String(req.body?.clubId ?? '').trim();
		const data = await toursService.addTourParticipant(req.params.id, clubId);
		res.status(201).json(data);
	} catch (error) {
		next(error);
	}
}

export async function removeTourParticipants(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const rawIds: unknown[] = Array.isArray(req.body?.clubIds) ? req.body.clubIds : [];
		const clubIds = rawIds
			.map((clubId: unknown) => String(clubId ?? '').trim())
			.filter((clubId: string) => clubId.length > 0);
		const removed = await toursService.removeTourParticipants(req.params.id, clubIds);
		res.status(200).json({ removed });
	} catch (error) {
		next(error);
	}
}

export async function getTourRencontres(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await toursService.getTourRencontres(req.params.id);
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export default {
	...baseController,
};
