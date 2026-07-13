import { createEntityController } from '../lib/controllerFactory';
import rencontresService from '../services/rencontres.service';
export default createEntityController(rencontresService);
