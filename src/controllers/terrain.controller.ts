import { createEntityController } from '../lib/controllerFactory';
import terrainService from '../services/terrain.service';

export default createEntityController(terrainService);
