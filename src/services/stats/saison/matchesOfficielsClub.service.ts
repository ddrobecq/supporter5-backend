import { dbAll } from '../../../config/database';
import { getSupportedClubIdFromEnv } from '../../../lib/supportedClub';

/**
 * Nombre de rencontres officielles jouees par le club supporte, par saison
 * (RENCO.TUCLEUNIK <> 0, club en DOMICILE ou EXTERIEUR). Mutualise entre
 * butsEquipe/sanctionsEquipe/composition (memes JOIN/WHERE/GROUP BY partout).
 */
export async function getNbMatchesOfficielsClubBySaison(): Promise<Map<string, number>> {
  const supportedClubId = getSupportedClubIdFromEnv();

  const rows = await dbAll<{ SAISON: string; MATCHES: number }>(
    `SELECT r.SAISON, COUNT(DISTINCT r.RECLEUNIK) AS MATCHES
     FROM RENCO r
     INNER JOIN MATCH m ON m.RECLEUNIK = r.RECLEUNIK
     WHERE r.TUCLEUNIK <> 0
       AND (r.DOMICILE = ? OR r.EXTERIEUR = ?)
       AND TRIM(COALESCE(r.SAISON, '')) <> ''
     GROUP BY r.SAISON`,
    [supportedClubId, supportedClubId],
  );

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(String(row.SAISON), Number(row.MATCHES ?? 0));
  }
  return map;
}
