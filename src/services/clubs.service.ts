import { createEntityService } from '../lib/baseService';
import { dbAll } from '../config/database';

/** CLUB_NOM = historique des noms de clubs */
export interface ClubGridRow {
  IDCLUB: string;
  CLUB_ABREGE: string;
  CLUB_NOM_COMPLET: string;
  VILLE_NOM: string;
}

export interface ClubsGridResponse {
  data: ClubGridRow[];
}

export async function getClubsGrid(search: string): Promise<ClubsGridResponse> {
  const normalizedSearch = search.trim().toLowerCase();
  const likeSearch = `%${normalizedSearch}%`;
  const params = [normalizedSearch, likeSearch, likeSearch];
  const data = await dbAll<ClubGridRow>(
    `SELECT
       c.IDCLUB,
       c.CLUB AS CLUB_ABREGE,
       COALESCE((
         SELECT cn.CN_NOM
         FROM CLUB_NOM cn
         WHERE cn.IDCLUB = c.IDCLUB
           AND (cn.CN_ACTION IS NULL OR cn.CN_ACTION <> 3)
         ORDER BY cn.DATE DESC
         LIMIT 1
       ), '') AS CLUB_NOM_COMPLET,
       COALESCE(v.NOM, '') AS VILLE_NOM
     FROM CLUB c
     LEFT JOIN VILLE v ON v.VICLEUNIK = c.IDVILLE
     WHERE (
       ? = ''
       OR LOWER(COALESCE(c.CLUB, '')) LIKE ?
       OR LOWER(COALESCE(v.NOM, '')) LIKE ?
     )
     ORDER BY c.CLUB ASC, c.IDCLUB ASC`,
    params,
  );

  return { data };
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
