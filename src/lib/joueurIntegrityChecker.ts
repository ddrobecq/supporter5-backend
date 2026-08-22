import { checkFkConstraints } from './fkIntegrity';
import type { IntegrityCheckResult } from '../types';

export async function checkJoueurIntegrity(joueurId: string): Promise<IntegrityCheckResult> {
  return checkFkConstraints(
    [
      { table: 'JOUEUR', column: 'IDJOUEUR', description: (n) => `${n} statistique(s) de saison pour ce joueur` },
      { table: 'BLESSURE', column: 'IDJOUEUR', description: (n) => `${n} blessure(s) liée(s) à ce joueur` },
      { table: 'TRANSAC', column: 'IDJOUEUR', description: (n) => `${n} transaction(s) liée(s) à ce joueur` },
      { table: 'JOTRO', column: 'IDJOUEUR', description: (n) => `${n} trophée(s) individuel(s) pour ce joueur` },
    ],
    joueurId,
  );
}
