import { createEntityController } from '../lib/controllerFactory';
import { integrityCheckerFor } from '../lib/fkDependencies';
import { parseSuggestQuery } from '../lib/requestQuery';
import { parseGridPagination } from '../lib/gridPagination';
import { dataHandler, jsonHandler, removedOr404, rowOr404 } from '../lib/responseHelpers';
import joueursService from '../services/joueurs.service';
import { AppError } from '../types';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = integrityCheckerFor('joueur');

const baseController = createEntityController(joueursService, { integrityChecker });

type TransactionPayload = {
	date: string;
	type: number | string;
	statut?: number | string;
	idClub?: string | null;
	salaire?: number | string | null;
	indemnites?: number | string | null;
	deviseId?: number | string | null;
	echeance?: string | null;
};
type HistoryPayload = { saison: string; poste: number | string };
type JoueurWizardPayload = { nom: string; prenom?: string; natioId: string; posteId: number; alias?: string; naissance?: string };

export const getJoueursGrid = jsonHandler((req) => {
	const season = String(req.query.season ?? '').trim();
	if (!/^\d{4}-\d{4}$/.test(season)) {
		throw new AppError(400, 'Parametre season invalide (xxxx-yyyy attendu)');
	}

	const search = String(req.query.search ?? '').trim();
	const posTypeRaw = req.query.posType;
	if (posTypeRaw != null && !/^-?\d+$/.test(String(posTypeRaw).trim())) {
		throw new AppError(400, 'Parametre posType invalide (entier attendu)');
	}
	const posType = posTypeRaw != null ? Number(String(posTypeRaw).trim()) : undefined;
	return joueursService.getJoueursGridBySeason(season, search, posType, parseGridPagination(req.query));
});

export const getJoueurSeasonRoster = dataHandler((req) => {
	const season = String(req.params.saison ?? '').trim();
	if (!/^\d{4}-\d{4}$/.test(season)) {
		throw new AppError(400, 'Parametre saison invalide (xxxx-yyyy attendu)');
	}
	return joueursService.getJoueurRosterForSeasonWizard(season);
});

export const getJoueurPostes = dataHandler(() => joueursService.getJoueurPostes());

export const getJoueurById = rowOr404((req) => joueursService.getJoueurByIdWithVille(req.params.id));

export const getJoueurHistory = dataHandler((req) => joueursService.getJoueurHistoryById(req.params.id));

export const getJoueurTransactions = dataHandler((req) => joueursService.getJoueurTransactionsById(req.params.id));

export const getJoueurTransactionOptions = jsonHandler((req) => joueursService.getJoueurTransactionOptions(req.params.id));

export const createJoueurTransaction = jsonHandler(
	(req) => joueursService.createJoueurTransactionById(req.params.id, req.body as TransactionPayload),
	201,
);

export const updateJoueurTransaction = rowOr404(
	(req) => joueursService.updateJoueurTransactionById(req.params.id, req.params.transactionId, req.body as TransactionPayload),
);

export const deleteJoueurTransaction = removedOr404(
	(req) => joueursService.deleteJoueurTransactionById(req.params.id, req.params.transactionId),
);

export const createJoueurHistory = rowOr404(
	(req) => joueursService.createJoueurHistoryById(req.params.id, req.body as HistoryPayload),
	201,
);

export const updateJoueurHistory = rowOr404(
	(req) => joueursService.updateJoueurHistoryById(req.params.id, req.params.historyId, req.body as HistoryPayload),
);

export const deleteJoueurHistory = removedOr404(
	(req) => joueursService.deleteJoueurHistoryById(req.params.id, req.params.historyId),
);

export const getJoueurSuggestions = jsonHandler((req) => {
	const { search, limit } = parseSuggestQuery(req);
	return joueursService.getJoueurSuggestions(search, limit);
});

export const createJoueurWithWizard = jsonHandler(
	(req) => joueursService.createJoueurWithWizard(req.body as JoueurWizardPayload),
	201,
);

export const getJoueurSeasonsByPlayedMatches = dataHandler(
	(req) => joueursService.getJoueurSeasonsByPlayedMatches(req.params.id),
);

export const getJoueurMatches = dataHandler((req) => {
	const saison = String(req.params.saison ?? '').trim();
	if (!/^\d{4}-\d{4}$/.test(saison)) {
		throw new AppError(400, 'Parametre saison invalide (xxxx-yyyy attendu).');
	}
	return joueursService.getJoueurMatchesForSeason(req.params.id, saison);
});

export default baseController;
