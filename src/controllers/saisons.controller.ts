import { createEntityController } from '../lib/controllerFactory';
import { jsonHandler } from '../lib/responseHelpers';
import saisonsService from '../services/saisons.service';

const baseController = createEntityController(saisonsService);

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
