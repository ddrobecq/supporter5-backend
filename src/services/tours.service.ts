import { createEntityService } from '../lib/baseService';

/** TOUR = tours / phases de compétition */
export default createEntityService({
  table:           'TOUR',
  pk:              'TDCLEUNIK',
  selectCols:      [
    'TDCLEUNIK',
    'TUCLEUNIK',
    'NB_PARTICIPANTS',
    'COCLEUNIK',
    'NOM',
    'DATE_DEBUT',
    'DATE_FIN',
    'TUHEURE',
    'NB_EQUIPE',
    'NB_GROUPE',
    'TU_ORDRE',
    'TU_FINAL',
    'TU_DATETIRAGE',
    'TU_HEURETIRAGE',
    'TU_SELECTION',
    'TU_COMMENT',
    'NB_MATCH',
  ],
  allowedSortCols: ['TDCLEUNIK', 'DATE_DEBUT', 'TU_ORDRE', 'NOM'],
  searchCols:      ['NOM', 'TU_COMMENT'],
  filterCols:      ['TUCLEUNIK', 'COCLEUNIK'],
});
