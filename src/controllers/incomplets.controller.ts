import { getClubsIncomplets, getJoueursIncomplets, getRencontresIncompletes } from '../services/incomplets.service';
import type { NextFunction, Request, Response } from 'express';

export async function getJoueursIncompletsList(_req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await getJoueursIncomplets();
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export async function getClubsIncompletsList(_req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await getClubsIncomplets();
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export async function getRencontresIncompletesList(_req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await getRencontresIncompletes();
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}
