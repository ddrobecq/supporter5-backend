import { createEntityService } from '../lib/baseService';

const baseService = createEntityService({
  table: 'VILLE',
  pk: 'VICLEUNIK',
  allowedSortCols: ['VICLEUNIK', 'NOM', 'IDNATIO'],
  searchCols: ['VICLEUNIK', 'NOM'],
  filterCols: ['IDNATIO'],
  searchStrategy: 'backend-memory',
});

async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  // ID auto-incrémenté: ignorer toute valeur d'ID fournie à la création.
  delete body.VICLEUNIK;

  // Valider que les champs requis sont présents
  if (!body.NOM || (typeof body.NOM === 'string' && !body.NOM.trim())) {
    throw new Error('NOM est requis');
  }
  if (!body.IDNATIO || (typeof body.IDNATIO === 'string' && !body.IDNATIO.trim())) {
    throw new Error('IDNATIO (Pays) est requis');
  }

  return baseService.create(body);
}

export default {
  ...baseService,
  create,
};
