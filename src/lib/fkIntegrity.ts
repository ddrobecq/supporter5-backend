import { dbAll } from '../config/database';
import { AppError, type IntegrityCheckResult, type IntegrityConstraint } from '../types';

export interface FkConstraintSpec {
  /** Table qui referencerait potentiellement l'enregistrement */
  table: string;
  /** Colonne de cette table portant la cle etrangere */
  column: string;
  /** Message affiche pour l'utilisateur, en fonction du nombre de references trouvees */
  description: (count: number) => string;
}

async function countReferences(table: string, column: string, value: string | number): Promise<number> {
  const rows = await dbAll<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${table} WHERE ${column} = ?`,
    [value],
  );
  return rows[0]?.count ?? 0;
}

/**
 * Verifie une liste de contraintes de cle etrangere pour un enregistrement donne
 * (mutualise le pattern "COUNT(*) FROM X WHERE fk = ?" repete dans les *IntegrityChecker).
 */
export async function checkFkConstraints(
  specs: readonly FkConstraintSpec[],
  value: string | number,
): Promise<IntegrityCheckResult> {
  const results = await Promise.all(
    specs.map(async (spec): Promise<IntegrityConstraint | null> => {
      const count = await countReferences(spec.table, spec.column, value);
      return count > 0 ? { table: spec.table, count, description: spec.description(count) } : null;
    }),
  );

  const constraints = results.filter((c): c is IntegrityConstraint => c !== null);
  return { canDelete: constraints.length === 0, constraints };
}

export type IntegrityChecker = (id: string) => Promise<IntegrityCheckResult>;

export function describeConstraints(result: IntegrityCheckResult): string {
  return result.constraints.map((constraint) => constraint.description).join(', ');
}

/** Throws a 409 whose details are the can-delete result when the record is still referenced. */
export async function assertCanDelete(id: string, checker: IntegrityChecker): Promise<void> {
  const result = await checker(id);
  if (!result.canDelete) {
    throw new AppError(409, `Suppression impossible : ${describeConstraints(result)}.`, result);
  }
}
