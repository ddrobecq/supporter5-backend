import { createEntityController } from '../lib/controllerFactory';
import deviseService from '../services/devise.service';

export default createEntityController(deviseService);
