import { createEntityController } from '../lib/controllerFactory';
import { checkTourIntegrity } from '../lib/integrityChecker';
import { dataHandler, jsonHandler, removedOr404, rowOr404 } from '../lib/responseHelpers';
import toursService from '../services/tours.service';
import rencontresService from '../services/rencontres.service';
import { AppError } from '../types';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = checkTourIntegrity;

const baseController = createEntityController(toursService, { integrityChecker });

export const getToursByCompetition = dataHandler((req) => toursService.getToursByCompetition(req.params.competitionId));

export const getTourByIdDetailed = rowOr404((req) => toursService.getTourByIdDetailed(req.params.id));

export const moveTour = dataHandler((req) => {
	const direction = req.body?.direction === 'down' ? 'down' : 'up';
	return toursService.moveTour(req.params.id, direction);
});

export const removeTour = removedOr404((req) => toursService.removeTourWithResequence(req.params.id, integrityChecker));

export const getTourParticipants = dataHandler((req) => toursService.getTourParticipants(req.params.id));

export const addTourParticipant = jsonHandler((req) => {
	const clubId = String(req.body?.clubId ?? '').trim();
	const groupe = String(req.body?.groupe ?? '').trim();
	const paSource = String(req.body?.paSource ?? '').trim();
	return toursService.addTourParticipant(req.params.id, clubId, groupe, paSource);
}, 201);

export const removeTourParticipants = jsonHandler(async (req) => {
	const rawClubIds: unknown[] = Array.isArray(req.body?.clubIds) ? req.body.clubIds : [];
	const clubIds = rawClubIds
		.map((clubId: unknown) => String(clubId ?? '').trim())
		.filter((clubId: string) => clubId.length > 0);

	const rawParticipantIds: unknown[] = Array.isArray(req.body?.participantIds) ? req.body.participantIds : [];
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

export default {
	...baseController,
};
