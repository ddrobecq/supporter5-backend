import { dbAll } from '../config/database';
import { createEntityService } from '../lib/baseService';

/** JOUEURRG = registre général des joueurs (nom, prénom, date de naissance…) */
const baseService = createEntityService({
  table:           'JOUEURRG',
  pk:              'IDJOUEUR',
  allowedSortCols: ['IDJOUEUR', 'NOM', 'PRENOM', 'NAISSANCE', 'POSTE', 'BUT', 'TITULAIRE'],
  searchCols:      ['NOM', 'PRENOM', 'SURNOM'],
  filterCols:      ['POSTE', 'IDNATIO'],
});

export interface JoueurGridRow {
  JOCLEUNIK: number;
  IDJOUEUR: string;
  SAISON: string;
  POSTE: number;
  JOUEUR_NOM: string;
  POSTE_NOM: string;
}

export async function getJoueursGridBySeason(season: string, search: string): Promise<JoueurGridRow[]> {
  const normalizedSearch = search.trim().toLowerCase();
  const likeSearch = `%${normalizedSearch}%`;

  return dbAll<JoueurGridRow>(
    `SELECT
      j.JOCLEUNIK,
      j.IDJOUEUR,
      j.SAISON,
      j.POSTE,
      COALESCE(
        NULLIF(TRIM(jr.SURNOM), ''),
        TRIM(UPPER(COALESCE(jr.NOM, '')) || ' ' || COALESCE(jr.PRENOM, ''))
      ) AS JOUEUR_NOM,
      p.POS_NOM AS POSTE_NOM
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
     INNER JOIN Poste p ON p.POS_ID = j.POSTE
     WHERE j.SAISON = ?
       AND p.POS_TYPE = 1
       AND (
         ? = ''
         OR LOWER(COALESCE(jr.SURNOM, '')) LIKE ?
         OR LOWER(COALESCE(jr.NOM, '')) LIKE ?
         OR LOWER(COALESCE(jr.PRENOM, '')) LIKE ?
         OR LOWER(COALESCE(p.POS_NOM, '')) LIKE ?
       )
     ORDER BY JOUEUR_NOM ASC, j.JOCLEUNIK ASC`,
    [season, normalizedSearch, likeSearch, likeSearch, likeSearch, likeSearch],
  );
}

export default {
  ...baseService,
  getJoueursGridBySeason,
};
