import { createEntityService } from '../lib/baseService';

export default createEntityService({
  table:           'SAISON',
  pk:              'SAISON',
  allowedSortCols: ['SAISON', 'SA_DEBUT', 'SA_FIN'],
  searchCols:      ['SAISON'],
  filterCols:      [],
});
