import { createEntityService } from '../lib/baseService';
import { dbAll, dbGet } from '../config/database';

/** CLUB_NOM = historique des noms de clubs */
export interface ClubGridRow {
  IDCLUB: string;
  CLUB_ABREGE: string;
  CLUB_NOM_COMPLET: string;
  VILLE_NOM: string;
}

export interface ClubsGridPage {
  data: ClubGridRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CountRow {
  total: number;
}

export async function getClubsGrid(search: string, page: number, limit: number): Promise<ClubsGridPage> {
  const normalizedSearch = search.trim().toLowerCase();
  const likeSearch = `%${normalizedSearch}%`;
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 100;
  const offset = (safePage - 1) * safeLimit;
  const params = [normalizedSearch, likeSearch, likeSearch];

  const totalRow = await dbGet<CountRow>(
    `SELECT COUNT(*) AS total
     FROM CLUB c
     LEFT JOIN VILLE v ON v.VICLEUNIK = c.IDVILLE
     WHERE (
       ? = ''
       OR LOWER(COALESCE(c.CLUB, '')) LIKE ?
       OR LOWER(COALESCE(v.NOM, '')) LIKE ?
     )`,
    params,
  );

  const total = Number(totalRow?.total ?? 0);
  const data = await dbAll<ClubGridRow>(
    `SELECT
       c.IDCLUB,
       c.CLUB AS CLUB_ABREGE,
       '' AS CLUB_NOM_COMPLET,
       COALESCE(v.NOM, '') AS VILLE_NOM
     FROM CLUB c
     LEFT JOIN VILLE v ON v.VICLEUNIK = c.IDVILLE
     WHERE (
       ? = ''
       OR LOWER(COALESCE(c.CLUB, '')) LIKE ?
       OR LOWER(COALESCE(v.NOM, '')) LIKE ?
     )
     ORDER BY c.CLUB ASC, c.IDCLUB ASC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset],
  );

  return {
    data,
    total,
    page: safePage,
    limit: safeLimit,
    totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0,
  };
}

const baseService = createEntityService({
  table:           'CLUB_NOM',
  pk:              'IDCLUB_NOM',
  allowedSortCols: ['IDCLUB_NOM', 'IDCLUB', 'CN_NOM', 'DATE'],
  searchCols:      ['CN_NOM'],
  filterCols:      ['IDCLUB'],
});

export default {
  ...baseService,
  getClubsGrid,
};
