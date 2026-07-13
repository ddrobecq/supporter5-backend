import { createEntityService } from '../lib/baseService';

export default createEntityService({
  table:           'RENCO',
  pk:              'RECLEUNIK',
  allowedSortCols: ['RECLEUNIK', 'DATE', 'SAISON', 'BUTDOM', 'BUTEXT', 'HEURE'],
  searchCols:      ['COMMENT'],
  filterCols:      ['SAISON', 'DOMICILE', 'EXTERIEUR', 'ETAT', 'TUCLEUNIK'],
});
