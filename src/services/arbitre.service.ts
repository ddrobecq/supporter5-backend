import { createEntityService } from '../lib/baseService';
import { dbGet, dbAll } from '../config/database';

const baseService = createEntityService({
  table: 'ARBITRE',
  pk: 'IDARBITRE',
  allowedSortCols: ['IDARBITRE', 'NOM', 'PRENOM', 'IDNATIO'],
  searchCols: ['IDARBITRE', 'NOM', 'PRENOM'],
  filterCols: ['IDNATIO'],
  searchStrategy: 'backend-memory',
});

// Override create pour générer IDARBITRE automatiquement
async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const idarbitreValue = body.IDARBITRE;

  // Si IDARBITRE est vide, null, ou une string vide, générer automatiquement
  if (!idarbitreValue || (typeof idarbitreValue === 'string' && idarbitreValue.trim() === '')) {
    // Trouver le prochain ID disponible (MAX + 1, formaté en 4 chiffres)
    const result = await dbGet<{ maxId: string }>(
      'SELECT COALESCE(MAX(CAST(IDARBITRE AS INTEGER)), 0) as maxId FROM ARBITRE',
    );
    const nextId = (parseInt(result?.maxId as unknown as string, 10) ?? 0) + 1;
    body.IDARBITRE = String(nextId).padStart(4, '0');
  }

  // Valider que les champs requis sont présents
  if (!body.NOM || (typeof body.NOM === 'string' && !body.NOM.trim())) {
    throw new Error('NOM est requis');
  }
  if (!body.PRENOM || (typeof body.PRENOM === 'string' && !body.PRENOM.trim())) {
    throw new Error('PRENOM est requis');
  }
  if (!body.IDNATIO || (typeof body.IDNATIO === 'string' && !body.IDNATIO.trim())) {
    throw new Error('IDNATIO (Nationalité) est requis');
  }

  // Utiliser le create de base service
  return baseService.create(body);
}

export default {
  ...baseService,
  create,
};
