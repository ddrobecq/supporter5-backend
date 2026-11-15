import { createEntityController } from '../lib/controllerFactory';
import { integrityCheckerFor } from '../lib/fkDependencies';
import { jsonHandler } from '../lib/responseHelpers';
import saisonsService, { parseSaisonWizardPayload } from '../services/saisons.service';

export const integrityChecker = integrityCheckerFor('saison');

const baseController = createEntityController(saisonsService, { integrityChecker });

export const createSaisonWithWizard = jsonHandler(
  (req) => saisonsService.createSaisonWithWizard(parseSaisonWizardPayload(req.body)),
  201,
);

export default baseController;
