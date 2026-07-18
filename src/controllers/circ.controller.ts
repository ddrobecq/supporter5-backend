import { createEntityController } from '../lib/controllerFactory';
import circService from '../services/circ.service';

export default createEntityController(circService);