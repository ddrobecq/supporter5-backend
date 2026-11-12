import { createEntityController } from '../lib/controllerFactory';
import { integrityCheckerFor } from '../lib/fkDependencies';
import tourDefService from '../services/tourdef.service';

export const integrityChecker = integrityCheckerFor('tourdef');

export default createEntityController(tourDefService, { integrityChecker });
