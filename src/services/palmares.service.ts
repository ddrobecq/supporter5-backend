import { dbAll } from '../config/database';

/** Winner of an awarded final round: participant ranked 1st (one per group, several final rounds possible). */
export interface PalmaresWinner {
  IDCLUB: string;
  CLUB: string;
}

/** One past competition (COMPET row) with its final date and the winners of its awarded final rounds. */
export interface PalmaresTitle {
  COCLEUNIK: number;
  IDEPREUVE: number;
  EPREUVE: string;
  OFFICIELLE: number;
  SCOPE: number;
  /** Final year when CO_ANNEE = 1 (calendar-year competition), COMPET.SAISON otherwise. */
  SAISON_LIBELLE: string;
  /** ISO 'YYYY-MM-DD': latest RENCO.DATE of the final rounds (round DATE_FIN/DATE_DEBUT when it has no match). */
  DATE_FINALE: string;
  /** [] when no final round is awarded. */
  VAINQUEURS: PalmaresWinner[];
}

export type PalmaresFilter = { epreuveId: number } | { clubId: string };

interface PalmaresSqlRow {
  COCLEUNIK: number;
  IDEPREUVE: number;
  EPREUVE: string;
  OFFICIELLE: number;
  SCOPE: number;
  SAISON_LIBELLE: string;
  DATE_FINALE: string;
  WINNER_ID: string | null;
  WINNER_NAME: string | null;
}

/** Competitions in scope: those of the event, or those where the club is ranked 1st in a final round. */
const SCOPED_COMPETS_BY_EPREUVE_SQL = 'SELECT co.COCLEUNIK FROM COMPET co WHERE co.IDEPREUVE = ?';
const SCOPED_COMPETS_BY_CLUB_SQL = `SELECT DISTINCT t.COCLEUNIK
       FROM PARTICIP p
       JOIN TOUR t ON t.TUCLEUNIK = p.TUCLEUNIK
       WHERE p.IDCLUB = ?
         AND COALESCE(p.PAClassement, 0) = 1
         AND COALESCE(t.TU_FINAL, 0) = 1`;

function todayInParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/**
 * Single palmares computation shared by events and clubs.
 * - final rounds: TOUR with TU_FINAL = 1 (several per competition allowed);
 * - a final round is awarded when all its matches are played or cancelled (ETAT 3/4) and at least one is played;
 * - winners: PARTICIP ranked 1st (PAClassement = 1) of each awarded final round, one per group;
 * - only past competitions: final date (latest match date of the final rounds) strictly before today.
 * Sorted by final date DESC.
 */
export async function fetchPalmaresTitles(filter: PalmaresFilter): Promise<PalmaresTitle[]> {
  const [scopedSql, scopeParam] = 'epreuveId' in filter
    ? [SCOPED_COMPETS_BY_EPREUVE_SQL, filter.epreuveId]
    : [SCOPED_COMPETS_BY_CLUB_SQL, filter.clubId];

  const rows = await dbAll<PalmaresSqlRow>(
    `WITH scoped_compets AS (
       ${scopedSql}
     ),
     final_tours AS (
       SELECT
         t.TUCLEUNIK,
         t.COCLEUNIK,
         COALESCE(t.TU_ORDRE, 0) AS TU_ORDRE,
         -- Final round without any match (e.g. final never played): fall back on the round's own dates.
         COALESCE(
           MAX(NULLIF(SUBSTR(COALESCE(r.DATE, ''), 1, 10), '')),
           NULLIF(SUBSTR(COALESCE(t.DATE_FIN, ''), 1, 10), ''),
           NULLIF(SUBSTR(COALESCE(t.DATE_DEBUT, ''), 1, 10), '')
         ) AS LAST_DATE,
         CASE
           WHEN SUM(CASE WHEN COALESCE(r.ETAT, 0) = 3 THEN 1 ELSE 0 END) > 0
            AND SUM(CASE WHEN r.RECLEUNIK IS NOT NULL AND COALESCE(r.ETAT, 0) NOT IN (3, 4) THEN 1 ELSE 0 END) = 0
           THEN 1 ELSE 0
         END AS AWARDED
       FROM scoped_compets sc
       JOIN TOUR t ON t.COCLEUNIK = sc.COCLEUNIK AND COALESCE(t.TU_FINAL, 0) = 1
       LEFT JOIN RENCO r ON r.TUCLEUNIK = t.TUCLEUNIK
       GROUP BY t.TUCLEUNIK, t.COCLEUNIK
     ),
     past_compets AS (
       SELECT COCLEUNIK, MAX(LAST_DATE) AS DATE_FINALE
       FROM final_tours
       GROUP BY COCLEUNIK
       HAVING MAX(LAST_DATE) IS NOT NULL AND MAX(LAST_DATE) < ?
     )
     SELECT
       pc.COCLEUNIK,
       co.IDEPREUVE,
       COALESCE(e.EPREUVE, '') AS EPREUVE,
       COALESCE(e.OFFICIELLE, 0) AS OFFICIELLE,
       COALESCE(e.SCOPE, 0) AS SCOPE,
       CASE
         WHEN COALESCE(co.CO_ANNEE, 0) = 1 THEN SUBSTR(pc.DATE_FINALE, 1, 4)
         ELSE COALESCE(co.SAISON, '')
       END AS SAISON_LIBELLE,
       pc.DATE_FINALE,
       p.IDCLUB AS WINNER_ID,
       COALESCE(c.CLUB, p.IDCLUB) AS WINNER_NAME
     FROM past_compets pc
     JOIN COMPET co ON co.COCLEUNIK = pc.COCLEUNIK
     LEFT JOIN EPREUVE e ON e.IDEPREUVE = co.IDEPREUVE
     LEFT JOIN final_tours ft ON ft.COCLEUNIK = pc.COCLEUNIK AND ft.AWARDED = 1
     LEFT JOIN PARTICIP p ON p.TUCLEUNIK = ft.TUCLEUNIK
       AND COALESCE(p.PAClassement, 0) = 1
       AND COALESCE(p.IDCLUB, '') <> ''
     LEFT JOIN CLUB c ON c.IDCLUB = p.IDCLUB
     ORDER BY pc.DATE_FINALE DESC, pc.COCLEUNIK DESC, ft.TU_ORDRE ASC, p.GROUPE ASC, WINNER_NAME ASC`,
    [scopeParam, todayInParis()],
  );

  const titles = new Map<number, PalmaresTitle>();
  for (const row of rows) {
    const cocleunik = Number(row.COCLEUNIK);
    let title = titles.get(cocleunik);
    if (!title) {
      title = {
        COCLEUNIK: cocleunik,
        IDEPREUVE: Number(row.IDEPREUVE),
        EPREUVE: String(row.EPREUVE ?? ''),
        OFFICIELLE: Number(row.OFFICIELLE ?? 0),
        SCOPE: Number(row.SCOPE ?? 0),
        SAISON_LIBELLE: String(row.SAISON_LIBELLE ?? '').trim(),
        DATE_FINALE: String(row.DATE_FINALE ?? ''),
        VAINQUEURS: [],
      };
      titles.set(cocleunik, title);
    }
    if (row.WINNER_ID === null || row.WINNER_ID === undefined) continue;
    const winnerId = String(row.WINNER_ID);
    if (!title.VAINQUEURS.some((winner) => winner.IDCLUB === winnerId)) {
      title.VAINQUEURS.push({ IDCLUB: winnerId, CLUB: String(row.WINNER_NAME ?? '') });
    }
  }

  return Array.from(titles.values());
}
