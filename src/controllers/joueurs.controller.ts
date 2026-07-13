import { createEntityController } from '../lib/controllerFactory';
import joueursService from '../services/joueurs.service';
export default createEntityController(joueursService);
