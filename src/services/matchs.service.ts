import { createEntityService } from '../lib/baseService';
import { dbAll } from '../config/database';
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

async function create(body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const item = await baseService.create(body);
  if (item) recomputeStatsForRencontreId(item.RECLEUNIK as string | number | null | undefined);
  return item;
}

async function update(id: string | number, body: Record<string, unknown>): Promise<Record<string, unknown> | undefined> {
  const item = await baseService.update(id, body);
  if (item) recomputeStatsForRencontreId(item.RECLEUNIK as string | number | null | undefined);
  return item;
}

async function bulkUpdate(ids: (string | number)[], body: Record<string, unknown>): Promise<number> {
  const changes = await baseService.bulkUpdate(ids, body);
  ids.forEach((id) => recomputeStatsForMatchId(id));
  return changes;
}

async function remove(id: string | number): Promise<boolean> {
  const before = await baseService.getById(id);
  const removed = await baseService.remove(id);
  if (removed) recomputeStatsForRencontreId(before?.RECLEUNIK as string | number | null | undefined);
  return removed;
}

async function bulkDelete(ids: (string | number)[]): Promise<number> {
  const marks = ids.map(() => '?').join(', ');
  const rows = ids.length
    ? await dbAll<{ RECLEUNIK: number }>(`SELECT "RECLEUNIK" FROM "MATCH" WHERE "MACLEUNIK" IN (${marks})`, ids)
    : [];
  const changes = await baseService.bulkDelete(ids);
  rows.forEach((row) => recomputeStatsForRencontreId(row.RECLEUNIK));
  return changes;
}

export default {
  ...baseService,
  create,
  update,
  bulkUpdate,
  remove,
  bulkDelete,
};
