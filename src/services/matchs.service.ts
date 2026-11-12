import { runInTransaction } from '../config/database';
import { createEntityService } from '../lib/baseService';
import { recomputeSupportedClubStatsForRencontreIds } from './rencontres.service';

const baseService = createEntityService({
  table:           'MATCH',
  pk:              'MACLEUNIK',
  selectCols:      [
    'MACLEUNIK',
    'IDARBITRE',
    'NBSPECT',
    'HUIS_CLOS',
    'CALCULE',
    'EXTRATIME',
    'PENALTY',
    'RESUME',
    'BILAN',
    'TEMPERATURE',
    'CLIMAT',
    'TV',
    'PELOUSE',
    'TECLEUNIK',
    'MADUREE',
    'MACOMPOADVERSAIRE',
    'RECLEUNIK',
  ],
  allowedSortCols: ['MACLEUNIK', 'NBSPECT'],
  searchCols:      ['RESUME', 'BILAN', 'MACOMPOADVERSAIRE'],
  filterCols:      ['IDARBITRE', 'RECLEUNIK'],
});

/**
 * N'importe quel champ de MATCH peut influer sur les stats saison du club supporte
 * (EXTRATIME/MADUREE pour la duree de jeu, etc.). On recalcule donc apres toute ecriture sur cette table
 * via le CRUD generique, quel que soit le champ modifie : rencontres d'avant ET d'apres l'ecriture
 * (RECLEUNIK modifiable), seulement si le club supporte y joue, et une seule fois par saison.
 */

// L'ecriture MATCH et le recalcul des stats qui en decoule sont atomiques.
async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  return runInTransaction(async () => {
    const item = await baseService.create(body);
    if (item) recomputeSupportedClubStatsForRencontreIds([item.RECLEUNIK]);
    return item;
  });
}

async function update(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  return runInTransaction(async () => {
    const before = await baseService.getById(id);
    const item = await baseService.update(id, body);
    if (item) recomputeSupportedClubStatsForRencontreIds([before?.RECLEUNIK, item.RECLEUNIK]);
    return item;
  });
}

export default {
  ...baseService,
  create,
  update,
};
