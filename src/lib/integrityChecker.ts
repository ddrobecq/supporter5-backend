import { checkFkConstraints } from './fkIntegrity';
import type { IntegrityCheckResult } from '../types';

/**
 * Vérifie si un enregistrement VILLE peut être supprimé
 * en contrôlant les dépendances en clé étrangère.
 */
export async function checkVilleIntegrity(villeId: string | number): Promise<IntegrityCheckResult> {
  return checkFkConstraints(
    [
      { table: 'CLUB', column: 'IDVILLE', description: (n) => `${n} club(s) basé(s) dans cette ville` },
      { table: 'JOUEURRG', column: 'IDVILLE', description: (n) => `${n} dossier(s) de joueur(s) avec cette ville` },
      { table: 'TERRAIN', column: 'IDVILLE', description: (n) => `${n} terrain(s) situé(s) dans cette ville` },
    ],
    villeId,
  );
}

/**
 * Vérifie si un enregistrement TERRAIN peut être supprimé
 * en contrôlant les dépendances principales connues.
 */
export async function checkTerrainIntegrity(terrainId: string | number): Promise<IntegrityCheckResult> {
  return checkFkConstraints(
    [
      { table: 'CLUB_TERRAIN', column: 'TECLEUNIK', description: (n) => `${n} liaison(s) club-terrain utilisent ce terrain` },
      { table: 'MATCH', column: 'TECLEUNIK', description: (n) => `${n} match(es) planifié(s) sur ce terrain` },
    ],
    terrainId,
  );
}

/**
 * Vérifie si un enregistrement DEVISE peut être supprimé.
 */
export async function checkDeviseIntegrity(deviseId: string | number): Promise<IntegrityCheckResult> {
  return checkFkConstraints(
    [{ table: 'TRANSAC', column: 'DVCLEUNIK', description: (n) => `${n} transaction(s) utilisant cette devise` }],
    deviseId,
  );
}

/**
 * Vérifie si un enregistrement CIRC peut être supprimé.
 */
export async function checkCircIntegrity(circId: string | number): Promise<IntegrityCheckResult> {
  return checkFkConstraints(
    [{ table: 'RENCO', column: 'IDCIRC', description: (n) => `${n} rencontre(s) utilisent cette circonstance` }],
    circId,
  );
}

/**
 * Vérifie si un enregistrement EPREUVE peut être supprimé.
 */
export async function checkEpreuveIntegrity(epreuveId: string | number): Promise<IntegrityCheckResult> {
  return checkFkConstraints(
    [{ table: 'COMPET', column: 'IDEPREUVE', description: (n) => `${n} compétition(s) utilisent cette épreuve` }],
    epreuveId,
  );
}

/**
 * Vérifie si un enregistrement COMPET peut être supprimé.
 */
export async function checkCompetitionIntegrity(competitionId: string | number): Promise<IntegrityCheckResult> {
  return checkFkConstraints(
    [{ table: 'TOUR', column: 'COCLEUNIK', description: (n) => `${n} tour(s) utilisent cette competition` }],
    competitionId,
  );
}

/**
 * Vérifie si un enregistrement TOUR peut être supprimé.
 */
export async function checkTourIntegrity(tourId: string | number): Promise<IntegrityCheckResult> {
  return checkFkConstraints(
    [
      { table: 'PARTICIP', column: 'TUCLEUNIK', description: (n) => `${n} participation(s) utilisent ce tour` },
      { table: 'Qualif', column: 'TUCLEUNIK', description: (n) => `${n} qualification(s) utilisent ce tour` },
      { table: 'RENCO', column: 'TUCLEUNIK', description: (n) => `${n} rencontre(s) utilisent ce tour` },
    ],
    tourId,
  );
}

/**
 * Vérifie si un enregistrement CLUB peut être supprimé.
 * Les tables "propriétaires" du club (CLUB_NOM, CLUB_TERRAIN) sont supprimées
 * automatiquement lors de l'opération de suppression.
 */
export async function checkClubIntegrity(clubId: string | number): Promise<IntegrityCheckResult> {
  return checkFkConstraints(
    [
      { table: 'RENCO', column: 'DOMICILE', description: (n) => `${n} rencontre(s) avec ce club comme domicile` },
      { table: 'RENCO', column: 'EXTERIEUR', description: (n) => `${n} rencontre(s) avec ce club comme exterieur` },
      { table: 'PARTICIP', column: 'IDCLUB', description: (n) => `${n} participation(s) de ce club` },
      { table: 'TRANSAC', column: 'IDCLUB', description: (n) => `${n} transaction(s) liee(s) a ce club` },
      { table: 'JOTRO', column: 'IDCLUB', description: (n) => `${n} trophee(s) de joueur(s) associe(s) a ce club` },
    ],
    clubId,
  );
}
