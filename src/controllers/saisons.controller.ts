import { createEntityController } from '../lib/controllerFactory';
import { integrityCheckerFor } from '../lib/fkDependencies';
import { jsonHandler } from '../lib/responseHelpers';
import saisonsService from '../services/saisons.service';

export const integrityChecker = integrityCheckerFor('saison');

const baseController = createEntityController(saisonsService, { integrityChecker });

export const createSaisonWithWizard = jsonHandler(
  (req) => saisonsService.createSaisonWithWizard(req.body as {
    saison: string;
    saDebut: string;
    saFin: string;
    joueurs?: Array<{ idJoueur: string; poste: number | string }>;
    competitions?: Array<{ competitionId: number | string; idem: boolean }>;
  }),
  201,
);

export default baseController;
