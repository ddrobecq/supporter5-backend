import { parseFlag, requireText, toText } from '../lib/coerce';
import { createEntityController } from '../lib/controllerFactory';
import { asyncHandler, dataHandler, jsonHandler } from '../lib/responseHelpers';
import rencontresService, { parseNbSpect } from '../services/rencontres.service';
import { AppError } from '../types';
import type { Request } from 'express';

const baseController = createEntityController(rencontresService);

type MatchMetaBody = {
	IDARBITRE?: unknown;
	TECLEUNIK?: unknown;
	NBSPECT?: unknown;
	HUIS_CLOS?: unknown;
	EXTRATIME?: unknown;
	PENALTY?: unknown;
} | undefined;

/** Trimmed `:id` route parameter, or AppError 400 when empty. */
function requireRencontreId(req: Request): string {
	return requireText(req.params.id, 'Identifiant de rencontre invalide.');
}

export const getCalendar = dataHandler((req) => {
	const date = toText(req.query.date);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		throw new AppError(400, 'Paramètre date invalide (YYYY-MM-DD attendu)');
	}
	return rencontresService.getCalendarByDate(date);
});

export const getOnThisDay = jsonHandler(async () => (await rencontresService.getOnThisDayMatch()) ?? null);

export const getRencontreDetail = jsonHandler(async (req) => {
	const data = await rencontresService.getRencontreDetailById(requireRencontreId(req));
	if (!data) {
		throw new AppError(404, 'Rencontre introuvable.');
	}
	return data;
});

export const getRencontreHighlights = jsonHandler(async (req) => {
	const data = await rencontresService.getRencontreHighlightsById(requireRencontreId(req));
	if (!data) {
		throw new AppError(404, 'Rencontre introuvable.');
	}
	return data;
});

export const getTourMatches = dataHandler((req) => rencontresService.getTourMatchesForRencontre(requireRencontreId(req)));

export const getComposition = jsonHandler(
	async (req) => (await rencontresService.getCompositionForRencontre(requireRencontreId(req))) ?? {},
);

export const saveComposition = jsonHandler(async (req) => {
	const id = requireRencontreId(req);
	return (await rencontresService.upsertCompositionForRencontre(id, req.body as Record<string, unknown>)) ?? {};
});

export const setArbitre = asyncHandler(async (req, res) => {
	const id = requireRencontreId(req);
	const idarbitre = toText((req.body as MatchMetaBody)?.IDARBITRE) || null;
	await rencontresService.upsertArbitreForRencontre(id, idarbitre);
	res.status(204).send();
});

export const setMatchMeta = asyncHandler(async (req, res) => {
	const id = requireRencontreId(req);

	const body = req.body as MatchMetaBody;
	await rencontresService.upsertMatchMetaForRencontre(id, {
		IDARBITRE: toText(body?.IDARBITRE) || null,
		TECLEUNIK: toText(body?.TECLEUNIK) || null,
		NBSPECT: body?.NBSPECT === undefined ? undefined : parseNbSpect(body.NBSPECT),
		HUIS_CLOS: body?.HUIS_CLOS === undefined ? undefined : parseFlag(body.HUIS_CLOS, 'HUIS_CLOS'),
		EXTRATIME: body?.EXTRATIME === undefined ? undefined : parseFlag(body.EXTRATIME, 'EXTRATIME'),
		PENALTY: body?.PENALTY === undefined ? undefined : parseFlag(body.PENALTY, 'PENALTY'),
	});
	res.status(204).send();
});

export const getSquad = dataHandler((req) => rencontresService.getSquadForRencontre(requireRencontreId(req)));

export const createWithImpact = jsonHandler(
	(req) => rencontresService.createWithImpact(req.body as Record<string, unknown>),
	201,
);

export const updateWithImpact = jsonHandler(async (req) => {
	const item = await rencontresService.updateWithImpact(req.params.id, req.body as Record<string, unknown>);
	if (!item) {
		throw new AppError(404, 'Rencontre introuvable.');
	}
	return item;
});

export const removeWithImpact = asyncHandler(async (req, res) => {
	const deleted = await rencontresService.removeWithImpact(req.params.id);
	if (!deleted) {
		throw new AppError(404, 'Rencontre introuvable.');
	}
	res.status(204).send();
});

export const createEvent = jsonHandler(async (req) => {
	const id = requireRencontreId(req);
	await rencontresService.createEventForRencontre(id, req.body);
	return rencontresService.getRencontreHighlightsById(id);
}, 201);

/** Route ids of an event, or AppError 400 'Identifiant invalide.' when one of them is empty. */
function requireEventIds(req: Request): { rencontreId: string; evcleunik: string } {
	return {
		rencontreId: requireText(req.params.id, 'Identifiant invalide.'),
		evcleunik: requireText(req.params.evid, 'Identifiant invalide.'),
	};
}

export const updateEvent = jsonHandler(async (req) => {
	const { rencontreId, evcleunik } = requireEventIds(req);
	await rencontresService.updateEventForRencontre(rencontreId, evcleunik, req.body);
	return rencontresService.getRencontreHighlightsById(rencontreId);
});

export const deleteEvent = jsonHandler(async (req) => {
	const { rencontreId, evcleunik } = requireEventIds(req);
	await rencontresService.deleteEventForRencontre(rencontreId, evcleunik);
	return rencontresService.getRencontreHighlightsById(rencontreId);
});

export const recomputeStats = asyncHandler(async (req, res) => {
	const id = requireRencontreId(req);
	rencontresService.recomputeStatsForRencontreId(id);
	res.status(204).send();
});

export default {
	...baseController,
	createWithImpact,
	updateWithImpact,
	removeWithImpact,
};
