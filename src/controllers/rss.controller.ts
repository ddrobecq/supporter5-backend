import { createEntityController } from '../lib/controllerFactory';
import { checkRssIntegrity } from '../lib/integrityChecker';
import rssService from '../services/rss.service';

/** Checker shared by the /:id/can-delete route and the server-side guard on deletions. */
export const integrityChecker = checkRssIntegrity;

export default createEntityController(rssService, { integrityChecker });
