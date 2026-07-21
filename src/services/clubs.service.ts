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
    `SELECT
       c.IDCLUB,
       c.CLUB AS CLUB_ABREGE,
       COALESCE(lcn.CN_NOM, c.CLUB) AS CLUB_NOM_COMPLET,
       COALESCE(v.NOM, '') AS VILLE_NOM
     FROM CLUB c
     LEFT JOIN CLUB_NOM lcn
       ON lcn.IDCLUB = c.IDCLUB
      AND lcn.IDCLUB_NOM = (
        SELECT cn2.IDCLUB_NOM
        FROM CLUB_NOM cn2
        WHERE cn2.IDCLUB = c.IDCLUB
        ORDER BY cn2.DATE DESC, cn2.IDCLUB_NOM DESC
        LIMIT 1
      )
     LEFT JOIN VILLE v ON v.VICLEUNIK = c.IDVILLE
     WHERE (
       ? = ''
       OR LOWER(COALESCE(c.CLUB, '')) LIKE ?
       OR LOWER(COALESCE(lcn.CN_NOM, c.CLUB, '')) LIKE ?
       OR LOWER(COALESCE(v.NOM, '')) LIKE ?
     )
     ORDER BY CLUB_NOM_COMPLET ASC, c.IDCLUB ASC`,
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
