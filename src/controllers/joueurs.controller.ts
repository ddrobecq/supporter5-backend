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

export async function getJoueurPostes(_req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await joueursService.getJoueurPostes();
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export async function getJoueurById(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const item = await joueursService.getJoueurByIdWithVille(req.params.id);
		if (!item) {
			res.status(404).json({ message: 'Not found' });
			return;
		}
		res.status(200).json(item);
	} catch (error) {
		next(error);
	}
}

export async function getJoueurHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await joueursService.getJoueurHistoryById(req.params.id);
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export async function getJoueurSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const search = String(req.query.search ?? '').trim();
		const rawLimit = Number(req.query.limit ?? 12);
		const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 30) : 12;
		const result = await joueursService.getJoueurSuggestions(search, limit);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export async function createJoueurWithWizard(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const created = await joueursService.createJoueurWithWizard(req.body as { nom: string; prenom?: string; natioId: string; posteId: number; alias?: string });
		res.status(201).json(created);
	} catch (error) {
		next(error);
	}
}
export default baseController;
