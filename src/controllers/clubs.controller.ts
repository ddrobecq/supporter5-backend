import { createEntityController } from '../lib/controllerFactory';
import clubsService from '../services/clubs.service';
import type { NextFunction, Request, Response } from 'express';

const baseController = createEntityController(clubsService);

export async function getClubsGrid(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const search = String(req.query.search ?? '').trim();
		const result = await clubsService.getClubsGrid(search);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function getClubGridById(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const row = await clubsService.getClubGridById(req.params.id);
		if (!row) {
			res.status(404).json({ message: 'Not found' });
			return;
		}
		res.status(200).json(row);
	} catch (error) {
		next(error);
	}
}

export async function getClubProfileById(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const row = await clubsService.getClubProfileById(req.params.id);
		if (!row) {
			res.status(404).json({ message: 'Not found' });
			return;
		}
		res.status(200).json(row);
	} catch (error) {
		next(error);
	}
}

export async function getClubNameHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await clubsService.getClubNameHistoryById(req.params.id);
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export async function getClubTerrainHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await clubsService.getClubTerrainHistoryById(req.params.id);
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export async function updateClubColors(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const row = await clubsService.updateClubColorsById(req.params.id, req.body as {
			fond: string | number | null;
			texte: string | number | null;
		});
		if (!row) {
			res.status(404).json({ message: 'Not found' });
			return;
		}
		res.status(200).json(row);
	} catch (error) {
		next(error);
	}
}

export async function updateClubProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const row = await clubsService.updateClubProfileById(req.params.id, req.body as {
			name: string;
			natioId: string;
			villeId?: string | number | null;
			fond?: string | number | null;
			texte?: string | number | null;
		});
		if (!row) {
			res.status(404).json({ message: 'Not found' });
			return;
		}
		res.status(200).json(row);
	} catch (error) {
		next(error);
	}
}

export async function getClubSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const search = String(req.query.search ?? '').trim();
		const rawLimit = Number(req.query.limit ?? 12);
		const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 30) : 12;
		const result = await clubsService.getClubSuggestions(search, limit);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function createClubWithWizard(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const created = await clubsService.createClubWithWizard(req.body as {
			name: string;
			natioId: string;
			isSelection: boolean;
			villeId?: string | number;
		});
		res.status(201).json(created);
	} catch (error) {
		next(error);
	}
}

export async function removeClub(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const removed = await clubsService.removeClubById(req.params.id);
		if (!removed) {
			res.status(404).json({ message: 'Not found' });
			return;
		}
		res.status(204).send();
	} catch (error) {
		next(error);
	}
}

export default baseController;
