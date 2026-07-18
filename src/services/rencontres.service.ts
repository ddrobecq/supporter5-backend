import { dbAll } from '../config/database';
import { createEntityService } from '../lib/baseService';

export interface CalendarMatchRow {
  RECLEUNIK: string | number;
  DATE: string;
  HEURE: string;
  ETAT: number;
  DOMICILE: string;
  EXTERIEUR: string;
  BUTDOM: number;
  BUTEXT: number;
  TABDOM: number;
  TABEXT: number;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
}

const baseService = createEntityService({
  table:           'RENCO',
  pk:              'RECLEUNIK',
  allowedSortCols: ['RECLEUNIK', 'DATE', 'SAISON', 'BUTDOM', 'BUTEXT', 'HEURE'],
  searchCols:      ['COMMENT'],
  filterCols:      ['SAISON', 'DOMICILE', 'EXTERIEUR', 'ETAT', 'TUCLEUNIK'],
});

export async function getCalendarByDate(date: string): Promise<CalendarMatchRow[]> {
  return dbAll<CalendarMatchRow>(
    `SELECT
      r.RECLEUNIK,
      r.DATE,
      r.HEURE,
      r.ETAT,
      r.DOMICILE,
      r.EXTERIEUR,
      r.BUTDOM,
      r.BUTEXT,
      r.TABDOM,
      r.TABEXT,
      COALESCE(cd.CLUB, r.DOMICILE) AS DOMICILE_NOM,
      COALESCE(ce.CLUB, r.EXTERIEUR) AS EXTERIEUR_NOM
     FROM RENCO r
     LEFT JOIN CLUB cd ON cd.IDCLUB = r.DOMICILE
     LEFT JOIN CLUB ce ON ce.IDCLUB = r.EXTERIEUR
     WHERE r.DATE = ?
     ORDER BY r.HEURE ASC, r.RECLEUNIK ASC`,
    [date],
  );
}

export default {
  ...baseService,
  getCalendarByDate,
};
