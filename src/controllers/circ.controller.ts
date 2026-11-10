import { createEntityController } from '../lib/controllerFactory';
import { checkCircIntegrity } from '../lib/integrityChecker';
import circService from '../services/circ.service';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = checkCircIntegrity;

export default createEntityController(circService, { integrityChecker });