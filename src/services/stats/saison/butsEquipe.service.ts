import { dbAll } from '../../../config/database';
import { getSupportedClubIdFromEnv } from '../../../lib/supportedClub';
import { getNbMatchesOfficielsClubBySaison } from './matchesOfficielsClub.service';

export type ButsEquipeMetric =
  | 'buts-pour'
  | 'buts-contre'
  | 'buts-pour-match'
  | 'buts-contre-match'
  | 'buts-match';

export interface ButsEquipeRow {
  SAISON: string;
  VALEUR: number;
}

/** Buts marques/encaisses par saison du point de vue du club supporte (matchs officiels uniquement). */
export async function getSaisonButsEquipe(metric: ButsEquipeMetric): Promise<ButsEquipeRow[]> {
  const supportedClubId = getSupportedClubIdFromEnv();

  const rows = await dbAll<{ SAISON: string; BUTS_POUR: number; BUTS_CONTRE: number }>(
    `SELECT
       r.SAISON,
       SUM(CASE WHEN r.DOMICILE = ? THEN COALESCE(r.BUTDOM, 0) ELSE COALESCE(r.BUTEXT, 0) END) AS BUTS_POUR,
       SUM(CASE WHEN r.DOMICILE = ? THEN COALESCE(r.BUTEXT, 0) ELSE COALESCE(r.BUTDOM, 0) END) AS BUTS_CONTRE
     FROM RENCO r
     INNER JOIN MATCH m ON m.RECLEUNIK = r.RECLEUNIK
     WHERE r.TUCLEUNIK <> 0
       AND (r.DOMICILE = ? OR r.EXTERIEUR = ?)
       AND TRIM(COALESCE(r.SAISON, '')) <> ''
     GROUP BY r.SAISON`,
    [supportedClubId, supportedClubId, supportedClubId, supportedClubId],
  );

  const matchesBySaison = await getNbMatchesOfficielsClubBySaison();

  const result: ButsEquipeRow[] = rows.map((row) => {
    const matches = matchesBySaison.get(String(row.SAISON)) ?? 0;
    const butsPour = Number(row.BUTS_POUR ?? 0);
    const butsContre = Number(row.BUTS_CONTRE ?? 0);
    let valeur = 0;
    switch (metric) {
      case 'buts-pour':
        valeur = butsPour;
        break;
      case 'buts-contre':
        valeur = butsContre;
        break;
      case 'buts-pour-match':
        valeur = matches > 0 ? Math.round((butsPour / matches) * 100) / 100 : 0;
        break;
      case 'buts-contre-match':
        valeur = matches > 0 ? Math.round((butsContre / matches) * 100) / 100 : 0;
        break;
      case 'buts-match':
        valeur = matches > 0 ? Math.round(((butsPour + butsContre) / matches) * 100) / 100 : 0;
        break;
    }
    return { SAISON: String(row.SAISON), VALEUR: valeur };
  });

  result.sort((a, b) => (b.VALEUR - a.VALEUR) || b.SAISON.localeCompare(a.SAISON));
  return result;
}
