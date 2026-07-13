import { createEntityService } from '../lib/baseService';

export default createEntityService({
  table:           'EQUIPE',
  pk:              'EQCLEUNIK',
  allowedSortCols: ['EQCLEUNIK', 'DATE', 'SAISON'],
  searchCols:      [],
  filterCols:      ['SAISON', 'MACLEUNIK'],
});
