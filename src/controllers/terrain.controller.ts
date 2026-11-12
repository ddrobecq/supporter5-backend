import { createEntityController } from '../lib/controllerFactory';
import { integrityCheckerFor } from '../lib/fkDependencies';
import terrainService from '../services/terrain.service';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = integrityCheckerFor('terrain');

export default createEntityController(terrainService, { integrityChecker });
