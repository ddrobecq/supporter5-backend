import { createEntityService } from '../lib/baseService';

export default createEntityService({
  table: 'TERRAIN',
  pk: 'TECLEUNIK',
  tableAlias: 't',
  joinClause: 'LEFT JOIN "VILLE" v ON t."IDVILLE" = v."VICLEUNIK"',
  selectCols: ['TECLEUNIK', 'STADE', 'IDVILLE'],
  extraSelectCols: ['v."NOM" AS VILLE_NOM'],
  allowedSortCols: ['TECLEUNIK', 'STADE', 'IDVILLE'],
  searchCols: ['TECLEUNIK', 'STADE', 'VILLE_NOM'],
  searchStrategy: 'backend-memory',
});
