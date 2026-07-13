import { createEntityService } from '../lib/baseService';

/** TOUR = tours / phases de compétition */
export default createEntityService({
  table:           'TOUR',
  pk:              'TDCLEUNIK',
  allowedSortCols: ['TDCLEUNIK', 'DATE_DEBUT', 'TU_ORDRE', 'NOM'],
  searchCols:      ['NOM', 'TU_COMMENT'],
  filterCols:      ['TUCLEUNIK', 'COCLEUNIK'],
});
