import { createEntityController } from '../lib/controllerFactory';
import statsService from '../services/stats.service';
export default createEntityController(statsService);
