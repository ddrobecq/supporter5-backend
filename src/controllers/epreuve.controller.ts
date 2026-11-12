import { createEntityController } from '../lib/controllerFactory';
import { integrityCheckerFor } from '../lib/fkDependencies';
import { parseSuggestQuery } from '../lib/requestQuery';
import { jsonHandler } from '../lib/responseHelpers';
import epreuveService from '../services/epreuve.service';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = integrityCheckerFor('epreuve');

const baseController = createEntityController(epreuveService, { integrityChecker });

export const getEpreuveSuggestions = jsonHandler((req) => {
	const { search, limit } = parseSuggestQuery(req);
	return epreuveService.getEpreuveSuggestions(search, limit);
});

export const createEpreuveWithWizard = jsonHandler(
	(req) => epreuveService.createEpreuveWithWizard(req.body as { name: string }),
	201,
);

export default baseController;
