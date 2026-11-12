import { createEntityController } from '../lib/controllerFactory';
import { integrityCheckerFor } from '../lib/fkDependencies';
import { parseSuggestQuery } from '../lib/requestQuery';
import { jsonHandler } from '../lib/responseHelpers';
import arbitreService from '../services/arbitre.service';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = integrityCheckerFor('arbitre');

const baseController = createEntityController(arbitreService, { integrityChecker });

export const getArbitreSuggestions = jsonHandler((req) => {
	const { search, limit } = parseSuggestQuery(req);
	return arbitreService.getArbitreSuggestions(search, limit);
});

export const createArbitreWithWizard = jsonHandler(
	(req) => arbitreService.createArbitreWithWizard(req.body as { nom: string; prenom?: string; natioId: string }),
	201,
);

export default baseController;
