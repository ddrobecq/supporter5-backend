/**
 * Jointures pour filtrer une rencontre par type de competition (EPREUVE.SCOPE).
 * Alias distincts (st_*) pour rester compatible avec CIRC_COMPLET_JOINS (t/co) dans la meme requete.
 * `rencoAlias` doit designer la table RENCO dans le FROM/CTE ou la jointure est inseree.
 */
export function scopeFilterJoins(rencoAlias: string = 'r'): string {
  return `LEFT JOIN TOUR st_t ON st_t.TUCLEUNIK = ${rencoAlias}.TUCLEUNIK
     LEFT JOIN COMPET st_co ON st_co.COCLEUNIK = st_t.COCLEUNIK
     LEFT JOIN EPREUVE st_ep ON st_ep.IDEPREUVE = st_co.IDEPREUVE`;
}

/** Clause a inserer dans le WHERE; ajouter `scope` aux parametres seulement si non-null. */
export function scopeFilterClause(scope: number | null | undefined): string {
  return scope != null ? 'AND st_ep.SCOPE = ?' : '';
}

const VALID_SCOPES = new Set([1, 2, 3, 4]);

/** Normalise un parametre de requete `scope` (string) en nombre valide ou null. */
export function parseScopeParam(value: unknown): number | null {
  const parsed = Number(value);
  return VALID_SCOPES.has(parsed) ? parsed : null;
}
