import { createEntityController } from '../lib/controllerFactory';
import { checkClubIntegrity } from '../lib/integrityChecker';
import { parseSuggestQuery } from '../lib/requestQuery';
import { parseGridPagination } from '../lib/gridPagination';
import { dataHandler, jsonHandler, removedOr404, rowOr404 } from '../lib/responseHelpers';
import clubsService from '../services/clubs.service';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = checkClubIntegrity;

// No integrityChecker here: this generic controller targets CLUB_NOM; club deletion is guarded in removeClub.
const baseController = createEntityController(clubsService);

type ClubColorsPayload = { fond: string | number | null; texte: string | number | null };
type ClubProfilePayload = {
	name: string;
	natioId: string;
	villeId?: string | number | null;
	fond?: string | number | null;
	texte?: string | number | null;
};
type ClubNamePayload = { date?: string | null; eventType: number | string; name: string };
type ClubTerrainPayload = { date?: string | null; terrainId: string | number };
type ClubWizardPayload = {
	name: string;
	natioId: string;
	isSelection: boolean;
	creationDate?: string;
	villeId?: string | number;
};

export const getClubsGrid = jsonHandler((req) => {
	const search = String(req.query.search ?? '').trim();
	return clubsService.getClubsGrid(search, parseGridPagination(req.query));
});

export const getClubGridById = rowOr404((req) => clubsService.getClubGridById(req.params.id));

export const getClubProfileById = rowOr404((req) => clubsService.getClubProfileById(req.params.id));

export const getClubNameHistory = dataHandler((req) => clubsService.getClubNameHistoryById(req.params.id));

export const getClubTerrainHistory = dataHandler((req) => clubsService.getClubTerrainHistoryById(req.params.id));

export const getClubMatches = dataHandler((req) => clubsService.getClubMatchesById(req.params.id));

export const getClubPalmares = dataHandler((req) => clubsService.getClubPalmares(req.params.id));

export const updateClubColors = rowOr404(
	(req) => clubsService.updateClubColorsById(req.params.id, req.body as ClubColorsPayload),
);

export const updateClubProfile = rowOr404(
	(req) => clubsService.updateClubProfileById(req.params.id, req.body as ClubProfilePayload),
);

export const createClubNameHistory = rowOr404(
	(req) => clubsService.createClubNameHistoryById(req.params.id, req.body as ClubNamePayload),
	201,
);

export const updateClubNameHistory = rowOr404(
	(req) => clubsService.updateClubNameHistoryById(req.params.id, req.params.nameId, req.body as ClubNamePayload),
);

export const deleteClubNameHistory = removedOr404(
	(req) => clubsService.deleteClubNameHistoryById(req.params.id, req.params.nameId),
);

export const createClubTerrainHistory = rowOr404(
	(req) => clubsService.createClubTerrainHistoryById(req.params.id, req.body as ClubTerrainPayload),
	201,
);

export const updateClubTerrainHistory = rowOr404(
	(req) => clubsService.updateClubTerrainHistoryById(req.params.id, req.params.terrainId, req.body as ClubTerrainPayload),
);

export const deleteClubTerrainHistory = removedOr404(
	(req) => clubsService.deleteClubTerrainHistoryById(req.params.id, req.params.terrainId),
);

export const getClubSuggestions = jsonHandler((req) => {
	const { search, limit } = parseSuggestQuery(req);
	return clubsService.getClubSuggestions(search, limit);
});

export const createClubWithWizard = jsonHandler(
	(req) => clubsService.createClubWithWizard(req.body as ClubWizardPayload),
	201,
);

export const removeClub = removedOr404((req) => clubsService.removeClubById(req.params.id, integrityChecker));

export const mergeClubs = jsonHandler((req) => {
	const { sourceId, targetId } = req.body as { sourceId?: unknown; targetId?: unknown };
	return clubsService.mergeClubs(sourceId, targetId);
});

export default baseController;
