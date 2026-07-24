import { createEntityService } from '../lib/baseService';

export default createEntityService({
  table:           'MATCH',
  pk:              'MACLEUNIK',
  selectCols:      [
    'MACLEUNIK',
    'SAISON',
    'IDARBITRE',
    'NBSPECT',
    'CALCULE',
    'EXTRATIME',
    'PENALTY',
    'RESUME',
    'BILAN',
    'TEMPERATURE',
    'CLIMAT',
    'TV',
    'PELOUSE',
    'LIEU',
    'TECLEUNIK',
    'MADUREE',
    'MACOMPOADVERSAIRE',
    'RECLEUNIK',
  ],
  allowedSortCols: ['MACLEUNIK', 'SAISON', 'NBSPECT'],
  searchCols:      ['RESUME', 'BILAN', 'MACOMPOADVERSAIRE'],
  filterCols:      ['SAISON', 'IDARBITRE', 'RECLEUNIK'],
});
