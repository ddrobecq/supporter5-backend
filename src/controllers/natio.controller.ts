import { createEntityController } from '../lib/controllerFactory';
import { checkNatioIntegrity } from '../lib/natioIntegrityChecker';
import natioService from '../services/natio.service';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = checkNatioIntegrity;

export default createEntityController(natioService, { integrityChecker });
