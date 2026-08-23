import { getImportAssociations, importRencontres, saveImportAssociation } from '../services/import.service';
import type { ImportRencontreRow } from '../services/rencontres.service';
import type { NextFunction, Request, Response } from 'express';

export async function getImportAssociationsList(_req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await getImportAssociations();
		res.status(200).json({ data });
	} catch (error) {
		next(error);
	}
}

export async function upsertImportAssociation(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const data = await saveImportAssociation(String(req.body?.nomClub ?? ''), String(req.body?.clubId ?? ''));
		res.status(200).json(data);
	} catch (error) {
		next(error);
	}
}

export async function importRencontresFromFile(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const rows = Array.isArray(req.body?.rows) ? (req.body.rows as ImportRencontreRow[]) : [];
		const data = await importRencontres(req.body?.tourId, String(req.body?.saison ?? ''), rows);
		res.status(200).json(data);
	} catch (error) {
		next(error);
	}
}
