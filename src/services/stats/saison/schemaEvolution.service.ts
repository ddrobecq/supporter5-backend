import { dbAll } from '../../../config/database';

/** Regroupement des postes de champ par ligne tactique, du gardien vers l'attaque. */
const LINE_GROUPS = [
  { key: 'GARDIEN', slots: ['GOAL'] },
  { key: 'DEFENSE', slots: ['DLG', 'DLD', 'DCG', 'DCD', 'LIB', 'STO'] },
  { key: 'MIL_DEFENSIF', slots: ['MDLD', 'MDLG', 'MDCD', 'MDCG', 'MDCC'] },
  { key: 'MIL_OFFENSIF', slots: ['MOLD', 'MOLG', 'MOCD', 'MOCG', 'MOCC'] },
  { key: 'ATTAQUE', slots: ['ALD', 'ALG', 'ACD', 'ACG', 'AVC'] },
] as const;

type LineKey = typeof LINE_GROUPS[number]['key'];

export type LigneEvolutionRow = { SAISON: string; MATCHES: number } & Record<LineKey, number>;

function lineCountExpr(slots: readonly string[]): string {
  return slots.map((slot) => `(CASE WHEN TRIM(COALESCE(e.${slot}, '')) <> '' THEN 1 ELSE 0 END)`).join(' + ');
}

function round1(value: unknown): number {
  return Math.round(Number(value ?? 0) * 10) / 10;
}

const MIN_JOUEURS_PAR_MATCH = 11;

/** Nombre moyen de joueurs par ligne tactique (gardien/defense/milieu def/milieu off/attaque), par saison. */
export async function getLignesEvolution(): Promise<LigneEvolutionRow[]> {
  const selectLines = LINE_GROUPS.map((group) => `AVG(${lineCountExpr(group.slots)}) AS ${group.key}`).join(',\n       ');

  const rows = await dbAll<Record<LineKey, number | null> & { SAISON: string; MATCHES: number }>(
    `SELECT e.SAISON,
       ${selectLines},
       COUNT(*) AS MATCHES
     FROM EQUIPE e
     INNER JOIN MATCH m ON m.MACLEUNIK = e.MACLEUNIK
     INNER JOIN RENCO r ON r.RECLEUNIK = m.RECLEUNIK
     WHERE COALESCE(r.TUCLEUNIK, 0) <> 0
       AND TRIM(COALESCE(e.SAISON, '')) <> ''
     GROUP BY e.SAISON
     ORDER BY e.SAISON ASC`,
  );

  return rows
    // Saisons dont les compositions saisies ne totalisent pas 11 joueurs en moyenne: donnees trop incompletes.
    .filter((row) => LINE_GROUPS.reduce((sum, group) => sum + Number(row[group.key] ?? 0), 0) >= MIN_JOUEURS_PAR_MATCH)
    .map((row) => ({
      SAISON: String(row.SAISON),
      GARDIEN: round1(row.GARDIEN),
      DEFENSE: round1(row.DEFENSE),
      MIL_DEFENSIF: round1(row.MIL_DEFENSIF),
      MIL_OFFENSIF: round1(row.MIL_OFFENSIF),
      ATTAQUE: round1(row.ATTAQUE),
      MATCHES: Number(row.MATCHES ?? 0),
    }));
}
