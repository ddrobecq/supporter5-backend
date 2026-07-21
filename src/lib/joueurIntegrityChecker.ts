import { dbAll } from '../config/database';

export interface IntegrityCheckResult {
  canDelete: boolean;
  constraints: Array<{
    table: string;
    count: number;
    description: string;
  }>;
}

export async function checkJoueurIntegrity(
  joueurId: string,
): Promise<IntegrityCheckResult> {
  const constraints = [];

  const joueurCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM JOUEUR WHERE IDJOUEUR = ?',
    [joueurId],
  );
  if ((joueurCount[0]?.count ?? 0) > 0) {
    constraints.push({
      table: 'JOUEUR',
      count: joueurCount[0]?.count ?? 0,
      description: `${joueurCount[0]?.count ?? 0} statistique(s) de saison pour ce joueur`,
    });
  }

  const blessureCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM BLESSURE WHERE IDJOUEUR = ?',
    [joueurId],
  );
  if ((blessureCount[0]?.count ?? 0) > 0) {
    constraints.push({
      table: 'BLESSURE',
      count: blessureCount[0]?.count ?? 0,
      description: `${blessureCount[0]?.count ?? 0} blessure(s) liée(s) à ce joueur`,
    });
  }

  const transacCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM TRANSAC WHERE IDJOUEUR = ?',
    [joueurId],
  );
  if ((transacCount[0]?.count ?? 0) > 0) {
    constraints.push({
      table: 'TRANSAC',
      count: transacCount[0]?.count ?? 0,
      description: `${transacCount[0]?.count ?? 0} transaction(s) liée(s) à ce joueur`,
    });
  }

  const jotroCount = await dbAll<{ count: number }>(
    'SELECT COUNT(*) as count FROM JOTRO WHERE IDJOUEUR = ?',
    [joueurId],
  );
  if ((jotroCount[0]?.count ?? 0) > 0) {
    constraints.push({
      table: 'JOTRO',
      count: jotroCount[0]?.count ?? 0,
      description: `${jotroCount[0]?.count ?? 0} trophée(s) individuel(s) pour ce joueur`,
    });
  }

  return {
    canDelete: constraints.length === 0,
    constraints,
  };
}
