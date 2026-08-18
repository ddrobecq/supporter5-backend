const SQL_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** SQL predicate for a player present in the latest roster and not last transferred out. */
export function joueurPresentSql(playerAlias = 'jr'): string {
  if (!SQL_IDENTIFIER.test(playerAlias)) {
    throw new Error(`Invalid player SQL alias: ${playerAlias}`);
  }

  return `EXISTS (
    SELECT 1
    FROM JOUEUR active_j
    WHERE active_j.IDJOUEUR = ${playerAlias}.IDJOUEUR
      AND active_j.SAISON = (SELECT MAX(SAISON) FROM JOUEUR)
  )
  AND COALESCE((
    SELECT t.STATUT
    FROM TRANSAC t
    WHERE t.IDJOUEUR = ${playerAlias}.IDJOUEUR
    ORDER BY t.DATE DESC, t.TNCLEUNIK DESC
    LIMIT 1
  ), 2) <> 1`;
}
