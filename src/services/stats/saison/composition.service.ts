import { dbAll } from '../../../config/database';
import { getSupportedClubIdFromEnv } from '../../../lib/supportedClub';

export type CompositionMetric =
  | 'nombre-joueurs'
  | 'nombre-etrangers'
  | 'nombre-nationalites'
  | 'age-moyen'
  | 'nombre-matches'
  | 'nombre-remplacements';

export interface CompositionRow {
  SAISON: string;
  VALEUR: number;
}

/** Effectif + composition du roster (Poste.POS_TYPE=1 exclut le staff) par saison. */
async function getRosterCompositionBySaison(): Promise<Map<string, {
  nbJoueurs: number;
  nbEtrangers: number;
  nbNationalites: number;
  ageMoyen: number;
  nbRemplacements: number;
}>> {
  const rows = await dbAll<{
    SAISON: string;
    NB_JOUEURS: number;
    NB_ETRANGERS: number;
    NB_NATIONALITES: number;
    AGE_MOYEN: number | null;
    NB_REMPLACEMENTS: number;
  }>(
    `SELECT
       j.SAISON,
       COUNT(DISTINCT j.IDJOUEUR) AS NB_JOUEURS,
       COUNT(DISTINCT CASE WHEN COALESCE(n.NALOCAL, 0) <> 1 THEN j.IDJOUEUR END) AS NB_ETRANGERS,
       COUNT(DISTINCT jr.IDNATIO) AS NB_NATIONALITES,
       AVG(
         CASE WHEN jr.NAISSANCE IS NOT NULL AND TRIM(jr.NAISSANCE) <> ''
           THEN (JULIANDAY(COALESCE(NULLIF(TRIM(sa.SA_DEBUT), ''), SUBSTR(j.SAISON, 1, 4) || '-07-01')) - JULIANDAY(jr.NAISSANCE)) / 365.25
           ELSE NULL
         END
       ) AS AGE_MOYEN,
       SUM(COALESCE(j.REMPTOTAL, 0)) AS NB_REMPLACEMENTS
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
     INNER JOIN Poste p ON p.POS_ID = j.POSTE AND p.POS_TYPE = 1
     LEFT JOIN SAISON sa ON sa.SAISON = j.SAISON
     LEFT JOIN NATIO n ON n.IDNATIO = jr.IDNATIO
     WHERE TRIM(COALESCE(j.SAISON, '')) <> ''
     GROUP BY j.SAISON`,
  );

  const map = new Map<string, {
    nbJoueurs: number;
    nbEtrangers: number;
    nbNationalites: number;
    ageMoyen: number;
    nbRemplacements: number;
  }>();
  for (const row of rows) {
    map.set(String(row.SAISON), {
      nbJoueurs: Number(row.NB_JOUEURS ?? 0),
      nbEtrangers: Number(row.NB_ETRANGERS ?? 0),
      nbNationalites: Number(row.NB_NATIONALITES ?? 0),
      ageMoyen: row.AGE_MOYEN != null ? Number(row.AGE_MOYEN) : 0,
      nbRemplacements: Number(row.NB_REMPLACEMENTS ?? 0),
    });
  }
  return map;
}

/** Nombre de rencontres officielles jouees par le club supporte, par saison. */
async function getNombreMatchesBySaison(): Promise<Map<string, number>> {
  const supportedClubId = getSupportedClubIdFromEnv();

  const rows = await dbAll<{ SAISON: string; NB_MATCHES: number }>(
    `SELECT r.SAISON, COUNT(DISTINCT r.RECLEUNIK) AS NB_MATCHES
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
    map.set(String(row.SAISON), Number(row.NB_MATCHES ?? 0));
  }
  return map;
}

/** Une ligne par saison pour la metrique de composition demandee, triee valeur decroissante. */
export async function getSaisonComposition(metric: CompositionMetric): Promise<CompositionRow[]> {
  const roster = await getRosterCompositionBySaison();
  const saisons = new Set(roster.keys());

  let matches: Map<string, number> | null = null;
  if (metric === 'nombre-matches' || metric === 'nombre-remplacements') {
    matches = await getNombreMatchesBySaison();
    for (const saison of matches.keys()) saisons.add(saison);
  }

  const result: CompositionRow[] = [];
  for (const saison of saisons) {
    const composition = roster.get(saison);
    let valeur = 0;
    switch (metric) {
      case 'nombre-joueurs':
        valeur = composition?.nbJoueurs ?? 0;
        break;
      case 'nombre-etrangers':
        valeur = composition?.nbEtrangers ?? 0;
        break;
      case 'nombre-nationalites':
        valeur = composition?.nbNationalites ?? 0;
        break;
      case 'age-moyen':
        valeur = composition ? Math.round(composition.ageMoyen * 10) / 10 : 0;
        break;
      case 'nombre-remplacements': {
        const nbMatches = matches?.get(saison) ?? 0;
        valeur = nbMatches > 0 ? Math.round(((composition?.nbRemplacements ?? 0) / nbMatches) * 10) / 10 : 0;
        break;
      }
      case 'nombre-matches':
        valeur = matches?.get(saison) ?? 0;
        break;
    }
    result.push({ SAISON: saison, VALEUR: valeur });
  }

  result.sort((a, b) => (b.VALEUR - a.VALEUR) || b.SAISON.localeCompare(a.SAISON));
  return result;
}
