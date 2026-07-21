import { dbAll, dbGet } from '../config/database';
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
  LAST_TRANSAC_SAISON: string | null;
  LAST_TRANSAC_STATUT: number | null;
  LAST_TRANSAC_TYPE: number | null;
}

export interface PosteOption {
  POS_ID: number;
  POS_NOM: string;
}

export async function getJoueurPostes(): Promise<PosteOption[]> {
  return dbAll<PosteOption>(
    `SELECT POS_ID, POS_NOM
     FROM Poste
     WHERE POS_TYPE = 1
     ORDER BY POS_NOM ASC, POS_ID ASC`,
  );
}

export async function getJoueurByIdWithVille(
  id: string | number,
): Promise<Record<string, unknown> | undefined> {
  return dbGet<Record<string, unknown>>(
    `SELECT
      jr.*, 
      vb.NOM AS VILLE_NOM,
      vd.NOM AS VILLE_DECES_NOM
     FROM JOUEURRG jr
     LEFT JOIN VILLE vb ON vb.VICLEUNIK = jr.IDVILLE
     LEFT JOIN VILLE vd ON vd.VICLEUNIK = jr.VILLE_DECES
     WHERE jr.IDJOUEUR = ?`,
    [id],
  );
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
      p.POS_NOM AS POSTE_NOM,
      tx.SAISON AS LAST_TRANSAC_SAISON,
      tx.STATUT AS LAST_TRANSAC_STATUT,
      tx.TYPE AS LAST_TRANSAC_TYPE
     FROM JOUEUR j
     INNER JOIN JOUEURRG jr ON jr.IDJOUEUR = j.IDJOUEUR
     INNER JOIN Poste p ON p.POS_ID = j.POSTE
     LEFT JOIN (
       SELECT t1.IDJOUEUR, t1.SAISON, t1.STATUT, t1.TYPE
       FROM TRANSAC t1
       INNER JOIN (
         SELECT IDJOUEUR, MAX(DATE || '-' || printf('%010d', TNCLEUNIK)) AS latest_key
         FROM TRANSAC
         GROUP BY IDJOUEUR
       ) latest
         ON latest.IDJOUEUR = t1.IDJOUEUR
        AND (t1.DATE || '-' || printf('%010d', t1.TNCLEUNIK)) = latest.latest_key
     ) tx ON tx.IDJOUEUR = j.IDJOUEUR
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
  getJoueurPostes,
  getJoueurByIdWithVille,
};
