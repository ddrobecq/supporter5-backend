import { toRawText } from '../lib/coerce';
import { dataHandler, jsonHandler } from '../lib/responseHelpers';
import { getImportAssociations, importRencontres, saveImportAssociation } from '../services/import.service';
import type { ImportRencontreRow } from '../services/rencontres.service';

type AssociationBody = { nomClub?: unknown; clubId?: unknown } | undefined;
type ImportBody = { tourId?: unknown; saison?: unknown; rows?: unknown } | undefined;

export const getImportAssociationsList = dataHandler(() => getImportAssociations());

export const upsertImportAssociation = jsonHandler((req) => {
	const body = req.body as AssociationBody;
	return saveImportAssociation(toRawText(body?.nomClub), toRawText(body?.clubId));
});

export const importRencontresFromFile = jsonHandler((req) => {
	const body = req.body as ImportBody;
	const rows = Array.isArray(body?.rows) ? (body.rows as ImportRencontreRow[]) : [];
	return importRencontres(toRawText(body?.tourId), toRawText(body?.saison), rows);
});
