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
 * Vérifie si un enregistrement NATIO peut être supprimé
 * en contrôlant les dépendances en clé étrangère.
 */
export async function checkNatioIntegrity(
  natioId: string | number,
): Promise<IntegrityCheckResult> {
  const constraints = [];

  // Vérifier les ARBITRE qui référencent ce NATIO
  const arbitreCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM ARBITRE WHERE IDNATIO = ?',
    [natioId],
  );
  if (arbitreCount[0]?.count ?? 0 > 0) {
    constraints.push({
      table: 'ARBITRE',
      count: arbitreCount[0]?.count ?? 0,
      description: `${arbitreCount[0]?.count ?? 0} arbitre(s) de cette nationalite`,
    });
  }

  // Vérifier les CLUB qui référencent ce NATIO
  const clubsCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM CLUB WHERE IDNATIO = ?',
    [natioId],
  );
  if (clubsCount[0]?.count ?? 0 > 0) {
    constraints.push({
      table: 'CLUB',
      count: clubsCount[0]?.count ?? 0,
      description: `${clubsCount[0]?.count ?? 0} club(s) de cette nationalite`,
    });
  }

  // Vérifier les JOUEURRG qui référencent ce NATIO
  const joueursCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM JOUEURRG WHERE IDNATIO = ?',
    [natioId],
  );
  if (joueursCount[0]?.count ?? 0 > 0) {
    constraints.push({
      table: 'JOUEURRG',
      count: joueursCount[0]?.count ?? 0,
      description: `${joueursCount[0]?.count ?? 0} joueur(s) de cette nationalite`,
    });
  }

  // Vérifier les VILLE qui référencent ce NATIO
  const villesCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM VILLE WHERE IDNATIO = ?',
    [natioId],
  );
  if (villesCount[0]?.count ?? 0 > 0) {
    constraints.push({
      table: 'VILLE',
      count: villesCount[0]?.count ?? 0,
      description: `${villesCount[0]?.count ?? 0} ville(s) de ce pays`,
    });
  }

  return {
    canDelete: constraints.length === 0,
    constraints,
  };
}
