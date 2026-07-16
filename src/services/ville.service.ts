import { createEntityService } from '../lib/baseService';
import { dbGet, dbRun, dbAll } from '../config/database';

const baseService = createEntityService({
  table: 'VILLE',
  pk: 'VICLEUNIK',
  allowedSortCols: ['VICLEUNIK', 'NOM', 'IDNATIO'],
  searchCols: ['VICLEUNIK', 'NOM'],
  filterCols: ['IDNATIO'],
  searchStrategy: 'backend-memory',
});

// Override create pour générer VICLEUNIK automatiquement
async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const vicleunikValue = body.VICLEUNIK;
  
  // Si VICLEUNIK est vide, null, ou une string vide, générer automatiquement
  if (!vicleunikValue || (typeof vicleunikValue === 'string' && vicleunikValue.trim() === '')) {
    // Trouver le prochain ID disponible (MAX + 1)
    const result = await dbGet<{ maxId: number }>(
      'SELECT COALESCE(MAX(VICLEUNIK), 0) as maxId FROM VILLE',
    );
    const nextId = (result?.maxId ?? 0) + 1;
    body.VICLEUNIK = nextId;
  } else if (typeof vicleunikValue === 'string') {
    // Si c'est une string, la convertir en int
    const intValue = parseInt(vicleunikValue, 10);
    if (!Number.isNaN(intValue)) {
      body.VICLEUNIK = intValue;
    } else {
      throw new Error('VICLEUNIK doit être un nombre valide');
    }
  }

  // Valider que les champs requis sont présents
  if (!body.NOM || (typeof body.NOM === 'string' && !body.NOM.trim())) {
    throw new Error('NOM est requis');
  }
  if (!body.IDNATIO || (typeof body.IDNATIO === 'string' && !body.IDNATIO.trim())) {
    throw new Error('IDNATIO (Pays) est requis');
  }

  // Utiliser le create de base service
  return baseService.create(body);
}

export default {
  ...baseService,
  create,
};
