import { dataHandler, jsonHandler } from '../lib/responseHelpers';
import { getImportAssociations, importRencontres, saveImportAssociation } from '../services/import.service';
import type { ImportRencontreRow } from '../services/rencontres.service';

export const getImportAssociationsList = dataHandler(() => getImportAssociations());

export const upsertImportAssociation = jsonHandler(
	(req) => saveImportAssociation(String(req.body?.nomClub ?? ''), String(req.body?.clubId ?? '')),
);

export const importRencontresFromFile = jsonHandler((req) => {
	const rows = Array.isArray(req.body?.rows) ? (req.body.rows as ImportRencontreRow[]) : [];
	return importRencontres(req.body?.tourId, String(req.body?.saison ?? ''), rows);
});
