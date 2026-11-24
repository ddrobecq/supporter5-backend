import { createEntityController } from '../lib/controllerFactory';
import { integrityCheckerFor } from '../lib/fkDependencies';
import { parseSuggestQuery } from '../lib/requestQuery';
import { dataHandler, jsonHandler } from '../lib/responseHelpers';
import epreuveService, { parseEpreuveWizardPayload } from '../services/epreuve.service';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = integrityCheckerFor('epreuve');

const baseController = createEntityController(epreuveService, { integrityChecker });

export const getEpreuveSuggestions = jsonHandler((req) => {
	const { search, limit } = parseSuggestQuery(req);
	return epreuveService.getEpreuveSuggestions(search, limit);
});

export const getEpreuvePalmares = dataHandler((req) => epreuveService.getEpreuvePalmares(req.params.id));

export const createEpreuveWithWizard = jsonHandler(
	(req) => epreuveService.createEpreuveWithWizard(parseEpreuveWizardPayload(req.body)),
	201,
);

export default baseController;
