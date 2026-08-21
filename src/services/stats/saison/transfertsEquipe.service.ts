import { dbAll } from '../../../config/database';

export type TransfertEquipeMetric = 'achats-cumules' | 'ventes-cumulees';

export interface TransfertEquipeRow {
  SAISON: string;
  VALEUR: number;
}

// DVCLEUNIK sans ligne DEVISE correspondante (ex: 0) => devise non renseignee, deja en devise par defaut (facteur 1).
const MONTANT_EN_DEVISE_DEFAUT = 'CAST(t.INDEMNITES AS REAL) / COALESCE(NULLIF(d.CONVERSION, 0), 1)';

/** Somme des indemnites d'achat (STATUT=2) ou de vente (STATUT=1) par saison, devise par defaut (DEVISE.CONVERSION). */
export async function getSaisonTransferts(metric: TransfertEquipeMetric): Promise<TransfertEquipeRow[]> {
  const statut = metric === 'achats-cumules' ? 2 : 1;

  const rows = await dbAll<{ SAISON: string; VALEUR: number | null }>(
    `SELECT
       t.SAISON,
       SUM(${MONTANT_EN_DEVISE_DEFAUT}) AS VALEUR
     FROM TRANSAC t
     LEFT JOIN DEVISE d ON d.DVCLEUNIK = t.DVCLEUNIK
     WHERE t.STATUT = ?
       AND COALESCE(t.INDEMNITES, 0) > 0
       AND TRIM(COALESCE(t.SAISON, '')) <> ''
     GROUP BY t.SAISON`,
    [statut],
  );

  const result: TransfertEquipeRow[] = rows.map((row) => ({
    SAISON: String(row.SAISON),
    VALEUR: Math.round(Number(row.VALEUR ?? 0) * 100) / 100,
  }));

  result.sort((a, b) => (b.VALEUR - a.VALEUR) || b.SAISON.localeCompare(a.SAISON));
  return result;
}
