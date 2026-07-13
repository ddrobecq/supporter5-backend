import { createEntityController } from '../lib/controllerFactory';
import clubsService from '../services/clubs.service';
export default createEntityController(clubsService);
