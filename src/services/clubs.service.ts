import { createEntityService } from '../lib/baseService';

/** CLUB_NOM = historique des noms de clubs */
export default createEntityService({
  table:           'CLUB_NOM',
  pk:              'IDCLUB_NOM',
  allowedSortCols: ['IDCLUB_NOM', 'IDCLUB', 'CN_NOM', 'DATE'],
  searchCols:      ['CN_NOM'],
  filterCols:      ['IDCLUB'],
});
