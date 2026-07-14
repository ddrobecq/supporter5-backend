import { createEntityService } from '../lib/baseService';

/** NATIO = pays / nationalites */
export default createEntityService({
  table: 'NATIO',
  pk: 'IDNATIO',
  allowedSortCols: ['IDNATIO', 'PAYS', 'NALOCAL'],
  searchCols: ['IDNATIO', 'PAYS'],
  filterCols: ['NALOCAL'],
  searchMode: 'local',
});
