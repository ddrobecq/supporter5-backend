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

const CLUBS_GRID_CTE = `WITH latest_club_name AS (
  SELECT ranked.IDCLUB, ranked.CN_NOM
  FROM (
    SELECT
      cn.IDCLUB,
      cn.CN_NOM,
      ROW_NUMBER() OVER (
        PARTITION BY cn.IDCLUB
        ORDER BY cn.DATE DESC, cn.IDCLUB_NOM DESC
      ) AS rn
    FROM CLUB_NOM cn
    WHERE COALESCE(cn.CN_ACTION, 0) <> 3
  ) ranked
  WHERE ranked.rn = 1
)`;

const CLUBS_GRID_FROM = `
FROM CLUB c
LEFT JOIN latest_club_name lcn ON lcn.IDCLUB = c.IDCLUB
LEFT JOIN VILLE v ON v.VICLEUNIK = c.IDVILLE
WHERE (
  ? = ''
  OR LOWER(COALESCE(c.CLUB, '')) LIKE ?
  OR LOWER(COALESCE(lcn.CN_NOM, c.CLUB, '')) LIKE ?
  OR LOWER(COALESCE(v.NOM, '')) LIKE ?
)`;

export async function getClubsGrid(search: string, page: number, limit: number): Promise<ClubsGridPage> {
  const normalizedSearch = search.trim().toLowerCase();
  const likeSearch = `%${normalizedSearch}%`;
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 100;
  const offset = (safePage - 1) * safeLimit;
  const params = [normalizedSearch, likeSearch, likeSearch, likeSearch];

  const totalRow = await dbGet<CountRow>(
    `${CLUBS_GRID_CTE}
     SELECT COUNT(*) AS total
     ${CLUBS_GRID_FROM}`,
    params,
  );

  const total = Number(totalRow?.total ?? 0);
  const data = await dbAll<ClubGridRow>(
    `${CLUBS_GRID_CTE}
     SELECT
       c.IDCLUB,
       c.CLUB AS CLUB_ABREGE,
       COALESCE(lcn.CN_NOM, c.CLUB) AS CLUB_NOM_COMPLET,
       COALESCE(v.NOM, '') AS VILLE_NOM
     ${CLUBS_GRID_FROM}
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
