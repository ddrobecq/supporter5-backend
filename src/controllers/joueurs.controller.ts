import { createEntityController } from '../lib/controllerFactory';
import { integrityCheckerFor } from '../lib/fkDependencies';
import { parseSuggestQuery } from '../lib/requestQuery';
import { parseGridPagination } from '../lib/gridPagination';
import { dataHandler, jsonHandler, removedOr404, rowOr404 } from '../lib/responseHelpers';
import { normalizeSaison } from '../lib/saisonRules';
import joueursService, {
	parseJoueurHistoryPayload,
	parseJoueurTransactionPayload,
	parseJoueurWizardPayload,
} from '../services/joueurs.service';
import { AppError } from '../types';
import { toText } from '../lib/coerce';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = integrityCheckerFor('joueur');

const baseController = createEntityController(joueursService, { integrityChecker });

export const getJoueursGrid = jsonHandler((req) => {
	// Absent or empty season: search across all seasons (one row per player).
	const seasonRaw = toText(req.query.season);
	const season = seasonRaw === '' ? '' : normalizeSaison(seasonRaw, 'Parametre season invalide (xxxx-yyyy attendu)');

	const search = toText(req.query.search);
	const posTypeRaw = req.query.posType;
	if (posTypeRaw != null && !/^-?\d+$/.test(toText(posTypeRaw))) {
		throw new AppError(400, 'Parametre posType invalide (entier attendu)');
	}
	const posType = posTypeRaw != null ? Number(toText(posTypeRaw)) : undefined;
	return joueursService.getJoueursGridBySeason(season, search, posType, parseGridPagination(req.query));
});

export const getJoueurSeasonRoster = dataHandler((req) => {
	const season = normalizeSaison(req.params.saison, 'Parametre saison invalide (xxxx-yyyy attendu)');
	return joueursService.getJoueurRosterForSeasonWizard(season);
});

export const getJoueurPostes = dataHandler(() => joueursService.getJoueurPostes());

export const getJoueurById = rowOr404((req) => joueursService.getJoueurByIdWithVille(req.params.id));

export const getJoueurHistory = dataHandler((req) => joueursService.getJoueurHistoryById(req.params.id));

export const getJoueurTransactions = dataHandler((req) => joueursService.getJoueurTransactionsById(req.params.id));

export const getJoueurTransactionOptions = jsonHandler((req) => joueursService.getJoueurTransactionOptions(req.params.id));

export const createJoueurTransaction = jsonHandler(
	(req) => joueursService.createJoueurTransactionById(req.params.id, parseJoueurTransactionPayload(req.body)),
	201,
);

export const updateJoueurTransaction = rowOr404(
	(req) => joueursService.updateJoueurTransactionById(req.params.id, req.params.transactionId, parseJoueurTransactionPayload(req.body)),
);

export const deleteJoueurTransaction = removedOr404(
	(req) => joueursService.deleteJoueurTransactionById(req.params.id, req.params.transactionId),
);

export const createJoueurHistory = rowOr404(
	(req) => joueursService.createJoueurHistoryById(req.params.id, parseJoueurHistoryPayload(req.body)),
	201,
);

export const updateJoueurHistory = rowOr404(
	(req) => joueursService.updateJoueurHistoryById(req.params.id, req.params.historyId, parseJoueurHistoryPayload(req.body)),
);

export const deleteJoueurHistory = removedOr404(
	(req) => joueursService.deleteJoueurHistoryById(req.params.id, req.params.historyId),
);

export const getJoueurSuggestions = jsonHandler((req) => {
	const { search, limit } = parseSuggestQuery(req);
	return joueursService.getJoueurSuggestions(search, limit);
});

export const createJoueurWithWizard = jsonHandler(
	(req) => joueursService.createJoueurWithWizard(parseJoueurWizardPayload(req.body)),
	201,
);

export const getJoueurSeasonsByPlayedMatches = dataHandler(
	(req) => joueursService.getJoueurSeasonsByPlayedMatches(req.params.id),
);

export const getJoueurMatches = dataHandler((req) => {
	const saison = normalizeSaison(req.params.saison, 'Parametre saison invalide (xxxx-yyyy attendu).');
	return joueursService.getJoueurMatchesForSeason(req.params.id, saison);
});

export default baseController;
