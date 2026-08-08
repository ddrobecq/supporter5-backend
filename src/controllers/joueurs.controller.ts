import { createEntityController } from '../lib/controllerFactory';
import { parseSuggestQuery } from '../lib/requestQuery';
import { sendNotFound } from '../lib/responseHelpers';
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
		const posTypeRaw = req.query.posType;
		const posType = posTypeRaw != null ? parseInt(String(posTypeRaw), 10) : undefined;
		const data = await joueursService.getJoueursGridBySeason(season, search, posType);
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
			sendNotFound(res);
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

export async function getJoueurTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await joueursService.getJoueurTransactionsById(req.params.id);
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export async function getJoueurTransactionOptions(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await joueursService.getJoueurTransactionOptions(req.params.id);
		res.status(200).json(data);
	} catch (error) {
		next(error);
	}
}

export async function createJoueurTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const row = await joueursService.createJoueurTransactionById(req.params.id, req.body as {
			date: string;
			type: number | string;
			statut?: number | string;
			idClub?: string | null;
			salaire?: number | string | null;
			indemnites?: number | string | null;
			deviseId: number | string;
			echeance?: string | null;
		});
		res.status(201).json(row);
	} catch (error) {
		next(error);
	}
}

export async function updateJoueurTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const row = await joueursService.updateJoueurTransactionById(req.params.id, req.params.transactionId, req.body as {
			date: string;
			type: number | string;
			statut?: number | string;
			idClub?: string | null;
			salaire?: number | string | null;
			indemnites?: number | string | null;
			deviseId: number | string;
			echeance?: string | null;
		});
		if (!row) {
			sendNotFound(res);
			return;
		}
		res.status(200).json(row);
	} catch (error) {
		next(error);
	}
}

export async function deleteJoueurTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const removed = await joueursService.deleteJoueurTransactionById(req.params.id, req.params.transactionId);
		if (!removed) {
			sendNotFound(res);
			return;
		}
		res.status(204).send();
	} catch (error) {
		next(error);
	}
}

export async function createJoueurHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const row = await joueursService.createJoueurHistoryById(req.params.id, req.body as {
			saison: string;
			poste: number | string;
		});
		if (!row) {
			sendNotFound(res);
			return;
		}
		res.status(201).json(row);
	} catch (error) {
		next(error);
	}
}

export async function updateJoueurHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const row = await joueursService.updateJoueurHistoryById(req.params.id, req.params.historyId, req.body as {
			saison: string;
			poste: number | string;
		});
		if (!row) {
			sendNotFound(res);
			return;
		}
		res.status(200).json(row);
	} catch (error) {
		next(error);
	}
}

export async function deleteJoueurHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const removed = await joueursService.deleteJoueurHistoryById(req.params.id, req.params.historyId);
		if (!removed) {
			sendNotFound(res);
			return;
		}
		res.status(204).send();
	} catch (error) {
		next(error);
	}
}

export async function getJoueurSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const { search, limit } = parseSuggestQuery(req);
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
