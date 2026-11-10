import { createEntityController } from '../lib/controllerFactory';
import { checkCompetitionIntegrity } from '../lib/integrityChecker';
import { jsonHandler } from '../lib/responseHelpers';
import competitionService from '../services/competition.service';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = checkCompetitionIntegrity;

const baseController = createEntityController(competitionService, { integrityChecker });

export const createCompetitionWithWizard = jsonHandler(
  (req) => competitionService.createCompetitionWithWizard(req.body as {
    epreuveId: string | number;
    saison: string;
    name?: string;
    sameAsLastEdition?: boolean;
  }),
  201,
);

export default baseController;
