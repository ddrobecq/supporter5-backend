import { dbAll } from '../../../config/database';
import { getNbMatchesOfficielsClubBySaison } from './matchesOfficielsClub.service';

export type SanctionEquipeMetric =
  | 'avertissements'
  | 'exclusions'
  | 'avertissements-match'
  | 'exclusions-match';

export interface SanctionEquipeRow {
  SAISON: string;
  VALEUR: number;
}

/** Sanctions du club supporte (JOUEUR.JAUNETOTAL/ROUGETOTAL, Poste.POS_TYPE=1) par saison, brut ou moyenne par match. */
export async function getSaisonSanctionsEquipe(metric: SanctionEquipeMetric): Promise<SanctionEquipeRow[]> {
  const rows = await dbAll<{ SAISON: string; JAUNES: number; ROUGES: number }>(
    `SELECT
       j.SAISON,
       SUM(COALESCE(j.JAUNETOTAL, 0)) AS JAUNES,
       SUM(COALESCE(j.ROUGETOTAL, 0)) AS ROUGES
     FROM JOUEUR j
     INNER JOIN Poste p ON p.POS_ID = j.POSTE AND p.POS_TYPE = 1
     WHERE TRIM(COALESCE(j.SAISON, '')) <> ''
     GROUP BY j.SAISON`,
  );

  const matchesBySaison = await getNbMatchesOfficielsClubBySaison();

  const result: SanctionEquipeRow[] = rows.map((row) => {
    const saison = String(row.SAISON);
    const jaunes = Number(row.JAUNES ?? 0);
    const rouges = Number(row.ROUGES ?? 0);
    const matches = matchesBySaison.get(saison) ?? 0;
    let valeur = 0;
    switch (metric) {
      case 'avertissements':
        valeur = jaunes;
        break;
      case 'exclusions':
        valeur = rouges;
        break;
      case 'avertissements-match':
        valeur = matches > 0 ? Math.round((jaunes / matches) * 100) / 100 : 0;
        break;
      case 'exclusions-match':
        valeur = matches > 0 ? Math.round((rouges / matches) * 100) / 100 : 0;
        break;
    }
    return { SAISON: saison, VALEUR: valeur };
  });

  result.sort((a, b) => (b.VALEUR - a.VALEUR) || b.SAISON.localeCompare(a.SAISON));
  return result;
}
