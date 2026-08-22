import { checkFkConstraints } from './fkIntegrity';
import type { IntegrityCheckResult } from '../types';

/**
 * Vérifie si un enregistrement ARBITRE peut être supprimé
 * en contrôlant les dépendances en clé étrangère.
 */
export async function checkArbitreIntegrity(arbitreId: string): Promise<IntegrityCheckResult> {
  return checkFkConstraints(
    [{ table: 'MATCH', column: 'IDARBITRE', description: (n) => `${n} match(s) arbitré(s) par cet arbitre` }],
    arbitreId,
  );
}
