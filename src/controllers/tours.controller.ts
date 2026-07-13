import { createEntityController } from '../lib/controllerFactory';
import toursService from '../services/tours.service';
export default createEntityController(toursService);
