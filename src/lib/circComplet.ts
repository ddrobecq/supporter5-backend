import { dbAll } from '../config/database';

export interface CircCompletSourceRow {
  TUCLEUNIK: number;
  CIRC: string | null;
  TOUR_NOM: string;
  COMPET_NOM: string;
  SAISON: string;
  CO_ANNEE: number;
  COCLEUNIK: number | null;
}

/** Colonnes a selectionner (alias `r` = RENCO, `t` = TOUR, `c` = CIRC, `co` = COMPET). */
export const CIRC_COMPLET_SELECT = `t.COCLEUNIK,
       COALESCE(r.TUCLEUNIK, 0) AS TUCLEUNIK,
       COALESCE(c.CIRC, '') AS CIRC,
       COALESCE(t.NOM, '') AS TOUR_NOM,
       COALESCE(co.NOM, '') AS COMPET_NOM,
       COALESCE(co.SAISON, r.SAISON, '') AS SAISON,
       COALESCE(co.CO_ANNEE, 0) AS CO_ANNEE`;

/** Jointures requises par CIRC_COMPLET_SELECT. */
export const CIRC_COMPLET_JOINS = `LEFT JOIN CIRC c ON c.IDCIRC = r.IDCIRC
     LEFT JOIN TOUR t ON t.TUCLEUNIK = r.TUCLEUNIK
     LEFT JOIN COMPET co ON co.COCLEUNIK = t.COCLEUNIK`;

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

export interface CircCompletResolver {
  saison: (row: CircCompletSourceRow) => string;
  circComplet: (row: CircCompletSourceRow) => string;
}

/**
 * Construit les libelles "saison" et "circonstance complete" pour un lot de rencontres.
 * Les competitions annuelles (CO_ANNEE = 1) sont datees par l'annee de leur finale.
 */
export async function buildCircCompletResolver(rows: CircCompletSourceRow[]): Promise<CircCompletResolver> {
  const competitionIds = Array.from(new Set(
    rows
      .map((row) => Number(row.COCLEUNIK ?? 0))
      .filter((value) => Number.isInteger(value) && value > 0),
  ));

  const finalYearByCompetition = new Map<number, string>();
  if (competitionIds.length > 0) {
    const placeholders = competitionIds.map(() => '?').join(', ');
    const finals = await dbAll<{ COCLEUNIK: number; FINAL_YEAR: string | null }>(
      `SELECT
         t.COCLEUNIK,
         MAX(SUBSTR(REPLACE(COALESCE(r.DATE, ''), '-', ''), 1, 4)) AS FINAL_YEAR
       FROM TOUR t
       INNER JOIN RENCO r ON r.TUCLEUNIK = t.TUCLEUNIK
       WHERE COALESCE(t.TU_FINAL, 0) = 1
         AND t.COCLEUNIK IN (${placeholders})
       GROUP BY t.COCLEUNIK`,
      competitionIds,
    );

    finals.forEach((row) => {
      const year = normalizeText(row.FINAL_YEAR);
      if (/^\d{4}$/.test(year)) {
        finalYearByCompetition.set(Number(row.COCLEUNIK), year);
      }
    });
  }

  const saison = (row: CircCompletSourceRow): string => {
    if (Number(row.CO_ANNEE ?? 0) === 1) {
      const fromFinal = finalYearByCompetition.get(Number(row.COCLEUNIK ?? 0));
      if (fromFinal) {
        return fromFinal;
      }
      return normalizeText(row.SAISON).match(/\d{4}/)?.[0] ?? '';
    }
    return normalizeText(row.SAISON);
  };

  const circComplet = (row: CircCompletSourceRow): string => {
    if (Number(row.TUCLEUNIK ?? 0) === 0) return 'Match amical';
    const circ = normalizeText(row.CIRC);
    const tour = normalizeText(row.TOUR_NOM);
    const competition = normalizeText(row.COMPET_NOM);
    const season = saison(row);

    let base: string;
    if (circ) {
      const suffix = [tour, competition].filter(Boolean).join(' de ');
      base = suffix ? `${circ} de ${suffix}` : circ;
    } else {
      base = [tour, competition].filter(Boolean).join(' de ');
    }

    if (season) {
      return base ? `${base} ${season}` : season;
    }
    return base;
  };

  return { saison, circComplet };
}
