import { createEntityController } from '../lib/controllerFactory';
import { integrityCheckerFor } from '../lib/fkDependencies';
import { dataHandler, jsonHandler, removedOr404, rowOr404 } from '../lib/responseHelpers';
import toursService from '../services/tours.service';
import rencontresService from '../services/rencontres.service';
import malusService from '../services/malus.service';
import { AppError } from '../types';
import { toText } from '../lib/coerce';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = integrityCheckerFor('tour');

const baseController = createEntityController(toursService, { integrityChecker });

export const getToursByCompetition = dataHandler((req) => toursService.getToursByCompetition(req.params.competitionId));

export const getTourByIdDetailed = rowOr404((req) => toursService.getTourByIdDetailed(req.params.id));

type MoveTourBody = { direction?: unknown } | undefined;
type AddParticipantBody = { clubId?: unknown; groupe?: unknown; paSource?: unknown } | undefined;
type RemoveParticipantsBody = { clubIds?: unknown; participantIds?: unknown } | undefined;

export const moveTour = dataHandler((req) => {
	const direction = (req.body as MoveTourBody)?.direction === 'down' ? 'down' : 'up';
	return toursService.moveTour(req.params.id, direction);
});

export const removeTour = removedOr404((req) => toursService.removeTourWithResequence(req.params.id, integrityChecker));

export const getTourParticipants = dataHandler((req) => toursService.getTourParticipants(req.params.id));

export const addTourParticipant = jsonHandler((req) => {
	const body = req.body as AddParticipantBody;
	const clubId = toText(body?.clubId);
	const groupe = toText(body?.groupe);
	const paSource = toText(body?.paSource);
	return toursService.addTourParticipant(req.params.id, clubId, groupe, paSource);
}, 201);

export const removeTourParticipants = jsonHandler(async (req) => {
	const body = req.body as RemoveParticipantsBody;
	const rawClubIds: unknown[] = Array.isArray(body?.clubIds) ? body.clubIds : [];
	const clubIds = rawClubIds
		.map((clubId: unknown) => toText(clubId))
		.filter((clubId: string) => clubId.length > 0);

	const rawParticipantIds: unknown[] = Array.isArray(body?.participantIds) ? body.participantIds : [];
	const participantIds = rawParticipantIds
		.map((participantId: unknown) => Number(participantId))
		.filter((participantId: number) => Number.isInteger(participantId) && participantId > 0);

	return { removed: await toursService.removeTourParticipants(req.params.id, clubIds, participantIds) };
});

export const getTourRencontres = dataHandler((req) => toursService.getTourRencontres(req.params.id));

export const recomputeTour = jsonHandler(async (req) => {
	const tourId = Number(req.params.id);
	if (!Number.isInteger(tourId) || tourId <= 0) {
		throw new AppError(400, 'Identifiant de tour invalide.');
	}
	rencontresService.recomputeTourStandings(tourId);
	return { recomputed: true };
});

export const getTourMalus = dataHandler((req) => malusService.getMalusOfTour(req.params.id));

export const createTourMalus = jsonHandler((req) => malusService.createMalus(req.params.id, req.body), 201);

export const updateTourMalus = jsonHandler((req) => malusService.updateMalus(req.params.id, req.params.malusId, req.body));

export const removeTourMalus = removedOr404((req) => malusService.removeMalus(req.params.id, req.params.malusId));

export default {
	...baseController,
};
