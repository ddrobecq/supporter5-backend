import { createEntityController } from '../lib/controllerFactory';
import { checkTerrainIntegrity } from '../lib/integrityChecker';
import terrainService from '../services/terrain.service';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = checkTerrainIntegrity;

export default createEntityController(terrainService, { integrityChecker });
