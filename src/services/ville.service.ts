import { createEntityService } from '../lib/baseService';

/** VILLE = villes / municipalities */
export default createEntityService({
  table: 'VILLE',
  pk: 'VICLEUNIK',
  allowedSortCols: ['VICLEUNIK', 'NOM', 'IDNATIO'],
  searchCols: ['VICLEUNIK', 'NOM'],
  filterCols: ['IDNATIO'],
  searchStrategy: 'backend-memory',
});
