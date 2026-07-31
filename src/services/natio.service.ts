import { createEntityService } from '../lib/baseService';

/** NATIO = pays / nationalites */
export default createEntityService({
  table: 'NATIO',
  pk: 'IDNATIO',
  selectCols: ['IDNATIO', 'PAYS', 'NALOCAL', 'NAT_ISO'],
  allowedSortCols: ['IDNATIO', 'PAYS', 'NALOCAL', 'NAT_ISO'],
  searchCols: ['IDNATIO', 'PAYS', 'NAT_ISO'],
  filterCols: ['NALOCAL'],
  searchStrategy: 'backend-memory',
});
