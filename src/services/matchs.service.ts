import { runInTransaction } from '../config/database';
import { createEntityService } from '../lib/baseService';
import { recomputeStatsForRencontreId, recomputeStatsForMatchId } from './rencontres.service';

const baseService = createEntityService({
  table:           'MATCH',
  pk:              'MACLEUNIK',
  selectCols:      [
    'MACLEUNIK',
    'SAISON',
    'IDARBITRE',
    'NBSPECT',
    'CALCULE',
    'EXTRATIME',
    'PENALTY',
    'RESUME',
    'BILAN',
    'TEMPERATURE',
    'CLIMAT',
    'TV',
    'PELOUSE',
    'LIEU',
    'TECLEUNIK',
    'MADUREE',
    'MACOMPOADVERSAIRE',
    'RECLEUNIK',
  ],
  allowedSortCols: ['MACLEUNIK', 'SAISON', 'NBSPECT'],
  searchCols:      ['RESUME', 'BILAN', 'MACOMPOADVERSAIRE'],
  filterCols:      ['SAISON', 'IDARBITRE', 'RECLEUNIK'],
});

/**
 * N'importe quel champ de MATCH peut influer sur les stats saison du club supporte
 * (EXTRATIME/MADUREE pour la duree de jeu, etc.). On recalcule donc systematiquement
 * apres toute ecriture sur cette table via le CRUD generique, quel que soit le champ modifie.
 */

// L'ecriture MATCH et le recalcul des stats qui en decoule sont atomiques.
async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  return runInTransaction(async () => {
    const item = await baseService.create(body);
    if (item) recomputeStatsForRencontreId(item.RECLEUNIK as string | number | null | undefined);
    return item;
  });
}

async function update(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  return runInTransaction(async () => {
    const item = await baseService.update(id, body);
    if (item) recomputeStatsForRencontreId(item.RECLEUNIK as string | number | null | undefined);
    return item;
  });
}

async function bulkUpdate(ids: (string | number)[], body: Record<string, unknown>): Promise<number> {
  return runInTransaction(async () => {
    const changes = await baseService.bulkUpdate(ids, body);
    ids.forEach((id) => recomputeStatsForMatchId(id));
    return changes;
  });
}

export default {
  ...baseService,
  create,
  update,
  bulkUpdate,
};
