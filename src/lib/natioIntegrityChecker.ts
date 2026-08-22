import { checkFkConstraints } from './fkIntegrity';
import type { IntegrityCheckResult } from '../types';

/**
 * Vérifie si un enregistrement NATIO peut être supprimé
 * en contrôlant les dépendances en clé étrangère.
 */
export async function checkNatioIntegrity(natioId: string | number): Promise<IntegrityCheckResult> {
  return checkFkConstraints(
    [
      { table: 'ARBITRE', column: 'IDNATIO', description: (n) => `${n} arbitre(s) de cette nationalite` },
      { table: 'CLUB', column: 'IDNATIO', description: (n) => `${n} club(s) de cette nationalite` },
      { table: 'JOUEURRG', column: 'IDNATIO', description: (n) => `${n} joueur(s) de cette nationalite` },
      { table: 'VILLE', column: 'IDNATIO', description: (n) => `${n} ville(s) de ce pays` },
    ],
    natioId,
  );
}
