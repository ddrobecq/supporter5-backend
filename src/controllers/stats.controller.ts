import { createEntityController } from '../lib/controllerFactory';
import { recomputePlayerStatsForSeasons } from '../services/rencontres.service';
import statsService from '../services/stats.service';
import type { NextFunction, Request, Response } from 'express';

export async function recomputePlayerStats(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const seasons = Array.isArray(req.body?.saisons) ? (req.body.saisons as unknown[]).map(String) : [];
		const result = await recomputePlayerStatsForSeasons(seasons);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
}

export default createEntityController(statsService);
