import { createEntityController } from '../lib/controllerFactory';
import { integrityCheckerFor } from '../lib/fkDependencies';
import { jsonHandler } from '../lib/responseHelpers';
import competitionService, { parseCompetitionWizardPayload } from '../services/competition.service';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = integrityCheckerFor('competition');

const baseController = createEntityController(competitionService, { integrityChecker });

export const createCompetitionWithWizard = jsonHandler(
  (req) => competitionService.createCompetitionWithWizard(parseCompetitionWizardPayload(req.body)),
  201,
);

export default baseController;
