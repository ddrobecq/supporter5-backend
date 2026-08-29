import { createEntityController } from '../lib/controllerFactory';
import rssService from '../services/rss.service';

export default createEntityController(rssService);
