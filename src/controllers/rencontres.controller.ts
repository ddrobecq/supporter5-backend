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

export async function getRencontreHighlights(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const id = String(req.params.id ?? '').trim();
		if (!id) {
			throw new AppError(400, 'Identifiant de rencontre invalide.');
		}

		const data = await rencontresService.getRencontreHighlightsById(id);
		if (!data) {
			throw new AppError(404, 'Rencontre introuvable.');
		}

		res.status(200).json(data);
	} catch (error) {
		next(error);
	}
}

export async function getTourMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const id = String(req.params.id ?? '').trim();
		if (!id) {
			throw new AppError(400, 'Identifiant de rencontre invalide.');
		}

		const data = await rencontresService.getTourMatchesForRencontre(id);
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export async function getComposition(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const id = String(req.params.id ?? '').trim();
		if (!id) throw new AppError(400, 'Identifiant de rencontre invalide.');
		const data = await rencontresService.getCompositionForRencontre(id);
		res.status(200).json(data ?? {});
	} catch (error) {
		next(error);
	}
}

export async function saveComposition(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const id = String(req.params.id ?? '').trim();
		if (!id) throw new AppError(400, 'Identifiant de rencontre invalide.');
		const data = await rencontresService.upsertCompositionForRencontre(id, req.body as Record<string, unknown>);
		res.status(200).json(data ?? {});
	} catch (error) {
		next(error);
	}
}

export async function getSquad(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const id = String(req.params.id ?? '').trim();
		if (!id) throw new AppError(400, 'Identifiant de rencontre invalide.');
		const data = await rencontresService.getSquadForRencontre(id);
		res.status(200).json({ data });
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

export async function createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const id = String(req.params.id ?? '').trim();
		if (!id) throw new AppError(400, 'Identifiant de rencontre invalide.');
		await rencontresService.createEventForRencontre(id, req.body as never);
		const highlights = await rencontresService.getRencontreHighlightsById(id);
		res.status(201).json(highlights);
	} catch (error) {
		next(error);
	}
}

export async function updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const rencontreId = String(req.params.id ?? '').trim();
		const evcleunik = String(req.params.evid ?? '').trim();
		if (!rencontreId || !evcleunik) throw new AppError(400, 'Identifiant invalide.');
		await rencontresService.updateEventForRencontre(evcleunik, req.body as never);
		const highlights = await rencontresService.getRencontreHighlightsById(rencontreId);
		res.status(200).json(highlights);
	} catch (error) {
		next(error);
	}
}

export async function deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const rencontreId = String(req.params.id ?? '').trim();
		const evcleunik = String(req.params.evid ?? '').trim();
		if (!rencontreId || !evcleunik) throw new AppError(400, 'Identifiant invalide.');
		await rencontresService.deleteEventForRencontre(evcleunik);
		const highlights = await rencontresService.getRencontreHighlightsById(rencontreId);
		res.status(200).json(highlights);
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
