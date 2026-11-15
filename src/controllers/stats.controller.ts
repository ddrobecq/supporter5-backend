import { toRawText } from '../lib/coerce';
import { createEntityController } from '../lib/controllerFactory';
import { jsonHandler } from '../lib/responseHelpers';
import { recomputePlayerStatsForSeasons } from '../services/rencontres.service';
import statsService from '../services/stats.service';

type RecomputeBody = { saisons?: unknown } | undefined;

export const recomputePlayerStats = jsonHandler((req) => {
	const body = req.body as RecomputeBody;
	const seasons = Array.isArray(body?.saisons) ? (body.saisons as unknown[]).map((saison) => toRawText(saison)) : [];
	return recomputePlayerStatsForSeasons(seasons);
});

export default createEntityController(statsService);
