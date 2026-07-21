import { createEntityService } from '../lib/baseService';
import { dbAll } from '../config/database';

/** CLUB_NOM = historique des noms de clubs */
export interface ClubGridRow {
  IDCLUB: string;
  CLUB_ABREGE: string;
  CLUB_NOM_COMPLET: string;
  VILLE_NOM: string;
}

export async function getClubsGrid(search: string): Promise<ClubGridRow[]> {
  const normalizedSearch = search.trim().toLowerCase();
  const likeSearch = `%${normalizedSearch}%`;

  return dbAll<ClubGridRow>(
    `WITH latest_club_name AS (
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
     )
     SELECT
       c.IDCLUB,
       c.CLUB AS CLUB_ABREGE,
       COALESCE(lcn.CN_NOM, c.CLUB) AS CLUB_NOM_COMPLET,
       COALESCE(v.NOM, '') AS VILLE_NOM
     FROM CLUB c
     LEFT JOIN latest_club_name lcn ON lcn.IDCLUB = c.IDCLUB
     LEFT JOIN VILLE v ON v.VICLEUNIK = c.IDVILLE
     WHERE (
       ? = ''
       OR LOWER(COALESCE(c.CLUB, '')) LIKE ?
       OR LOWER(COALESCE(lcn.CN_NOM, c.CLUB, '')) LIKE ?
       OR LOWER(COALESCE(v.NOM, '')) LIKE ?
     )
     ORDER BY c.CLUB ASC, c.IDCLUB ASC`,
    [normalizedSearch, likeSearch, likeSearch, likeSearch],
  );
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
