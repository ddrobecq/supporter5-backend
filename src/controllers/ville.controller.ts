import { createEntityController } from '../lib/controllerFactory';
import { checkVilleIntegrity } from '../lib/integrityChecker';
import villeService from '../services/ville.service';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = checkVilleIntegrity;

export default createEntityController(villeService, { integrityChecker });
