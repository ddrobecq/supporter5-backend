import { createEntityService } from '../lib/baseService';

export default createEntityService({
  table:           'MATCH',
  pk:              'MACLEUNIK',
  allowedSortCols: ['MACLEUNIK', 'SAISON', 'NBSPECT'],
  searchCols:      ['RESUME', 'BILAN', 'MACOMPOADVERSAIRE'],
  filterCols:      ['SAISON', 'IDARBITRE', 'RECLEUNIK'],
});
