import { dbAll } from '../config/database';

export interface IntegrityCheckResult {
  canDelete: boolean;
  constraints: Array<{
    table: string;
    count: number;
    description: string;
  }>;
}

/**
 * Vérifie si un enregistrement VILLE peut être supprimé
 * en contrôlant les dépendances en clé étrangère.
 */
export async function checkVilleIntegrity(
  villeId: string | number,
): Promise<IntegrityCheckResult> {
  const constraints = [];

  // Vérifier les CLUB qui référencent cette VILLE
  const clubsCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM CLUB WHERE IDVILLE = ?',
    [villeId],
  );
  if (clubsCount[0]?.count ?? 0 > 0) {
    constraints.push({
      table: 'CLUB',
      count: clubsCount[0]?.count ?? 0,
      description: `${clubsCount[0]?.count ?? 0} club(s) basé(s) dans cette ville`,
    });
  }

  // Vérifier les JOUEURRG qui référencent cette VILLE
  const joueursCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM JOUEURRG WHERE IDVILLE = ?',
    [villeId],
  );
  if (joueursCount[0]?.count ?? 0 > 0) {
    constraints.push({
      table: 'JOUEURRG',
      count: joueursCount[0]?.count ?? 0,
      description: `${joueursCount[0]?.count ?? 0} dossier(s) de joueur(s) avec cette ville`,
    });
  }

  // Vérifier les TERRAIN qui référencent cette VILLE
  const terrainsCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM TERRAIN WHERE IDVILLE = ?',
    [villeId],
  );
  if (terrainsCount[0]?.count ?? 0 > 0) {
    constraints.push({
      table: 'TERRAIN',
      count: terrainsCount[0]?.count ?? 0,
      description: `${terrainsCount[0]?.count ?? 0} terrain(s) situé(s) dans cette ville`,
    });
  }

  return {
    canDelete: constraints.length === 0,
    constraints,
  };
}

/**
 * Vérifie si un enregistrement TERRAIN peut être supprimé
 * en contrôlant les dépendances principales connues.
 */
export async function checkTerrainIntegrity(
  terrainId: string | number,
): Promise<IntegrityCheckResult> {
  const constraints = [];

  // Vérifier les CLUB_TERRAIN qui référencent ce TERRAIN
  const clubTerrainsCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM CLUB_TERRAIN WHERE TECLEUNIK = ?',
    [terrainId],
  );
  if (clubTerrainsCount[0]?.count ?? 0 > 0) {
    constraints.push({
      table: 'CLUB_TERRAIN',
      count: clubTerrainsCount[0]?.count ?? 0,
      description: `${clubTerrainsCount[0]?.count ?? 0} liaison(s) club-terrain utilisent ce terrain`,
    });
  }

  // Vérifier les MATCH qui référencent ce TERRAIN
  const matchsCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM MATCH WHERE TECLEUNIK = ?',
    [terrainId],
  );
  if (matchsCount[0]?.count ?? 0 > 0) {
    constraints.push({
      table: 'MATCH',
      count: matchsCount[0]?.count ?? 0,
      description: `${matchsCount[0]?.count ?? 0} match(es) planifié(s) sur ce terrain`,
    });
  }

  return {
    canDelete: constraints.length === 0,
    constraints,
  };
}
