import { createEntityController } from '../lib/controllerFactory';
import { integrityCheckerFor } from '../lib/fkDependencies';
import { normalizeDayDate } from '../lib/dates';
import { jsonHandler } from '../lib/responseHelpers';
import { resolveTransactionSeason } from '../lib/transactionSeason';
import saisonsService, { parseSaisonWizardPayload } from '../services/saisons.service';

export const integrityChecker = integrityCheckerFor('saison');

const baseController = createEntityController(saisonsService, { integrityChecker });

export const createSaisonWithWizard = jsonHandler(
  (req) => saisonsService.createSaisonWithWizard(parseSaisonWizardPayload(req.body)),
  201,
);

/** GET ?date=YYYY-MM-DD -> { saison } : saison des mouvements (TRANSAC.SAISON) attendue pour cette date. */
export const getTransactionSeason = jsonHandler(async (req) => {
  const date = normalizeDayDate(req.query.date, { required: true, field: 'de la transaction' });
  return { saison: resolveTransactionSeason(date) };
});

export default baseController;
