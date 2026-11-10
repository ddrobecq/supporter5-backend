import { createEntityController } from '../lib/controllerFactory';
import { checkDeviseIntegrity } from '../lib/integrityChecker';
import deviseService from '../services/devise.service';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = checkDeviseIntegrity;

export default createEntityController(deviseService, { integrityChecker });
