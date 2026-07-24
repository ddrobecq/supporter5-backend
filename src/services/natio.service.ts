import { createEntityService } from '../lib/baseService';

/** NATIO = pays / nationalites */
export default createEntityService({
  table: 'NATIO',
  pk: 'IDNATIO',
  selectCols: ['IDNATIO', 'PAYS', 'NALOCAL'],
  allowedSortCols: ['IDNATIO', 'PAYS', 'NALOCAL'],
  searchCols: ['IDNATIO', 'PAYS'],
  filterCols: ['NALOCAL'],
  searchStrategy: 'backend-memory',
});
