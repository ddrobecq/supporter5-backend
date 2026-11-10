import { createEntityController } from '../lib/controllerFactory';
import { jsonHandler } from '../lib/responseHelpers';
import { recomputePlayerStatsForSeasons } from '../services/rencontres.service';
import statsService from '../services/stats.service';

export const recomputePlayerStats = jsonHandler((req) => {
	const seasons = Array.isArray(req.body?.saisons) ? (req.body.saisons as unknown[]).map(String) : [];
	return recomputePlayerStatsForSeasons(seasons);
});

export default createEntityController(statsService);
