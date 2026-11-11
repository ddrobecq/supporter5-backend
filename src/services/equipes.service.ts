import { createEntityService } from '../lib/baseService';
import { ALL_SLOTS } from '../lib/compo';

export default createEntityService({
  table:           'EQUIPE',
  pk:              'EQCLEUNIK',
  selectCols:      ['EQCLEUNIK', ...ALL_SLOTS, 'ENTRAINEUR', 'MACLEUNIK'],
  allowedSortCols: ['EQCLEUNIK'],
  searchCols:      [],
  filterCols:      ['MACLEUNIK'],
});
