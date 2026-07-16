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
 * Vérifie si un enregistrement ARBITRE peut être supprimé
 * en contrôlant les dépendances en clé étrangère.
 */
export async function checkArbitreIntegrity(
  arbitreId: string,
): Promise<IntegrityCheckResult> {
  const constraints = [];

  // Vérifier les MATCH qui référencent cet ARBITRE
  const matchCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM MATCH WHERE IDARBITRE = ?',
    [arbitreId],
  );
  if (matchCount[0]?.count ?? 0 > 0) {
    constraints.push({
      table: 'MATCH',
      count: matchCount[0]?.count ?? 0,
      description: `${matchCount[0]?.count ?? 0} match(s) arbitré(s) par cet arbitre`,
    });
  }

  return {
    canDelete: constraints.length === 0,
    constraints,
  };
}
