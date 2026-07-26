import { createEntityController } from '../lib/controllerFactory';
import tourDefService from '../services/tourdef.service';

export default createEntityController(tourDefService);
