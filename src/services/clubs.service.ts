import { createEntityService } from '../lib/baseService';
import { dbAll } from '../config/database';

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

export async function getClubsGrid(_search: string, _page: number, _limit: number): Promise<ClubsGridPage> {
  const data = await dbAll<ClubGridRow>(
    `SELECT
       c.IDCLUB,
       c.CLUB AS CLUB_ABREGE,
       '' AS CLUB_NOM_COMPLET,
       COALESCE(v.NOM, '') AS VILLE_NOM
     FROM CLUB c
      LEFT JOIN VILLE v ON v.VICLEUNIK = c.IDVILLE`,
  );

  return {
    data,
    total: data.length,
    page: 1,
    limit: 25,
    totalPages: 1,
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
