import { createEntityController } from '../lib/controllerFactory';
import matchsService from '../services/matchs.service';
export default createEntityController(matchsService);
