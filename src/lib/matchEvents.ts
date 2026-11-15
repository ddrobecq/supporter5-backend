/**
 * Evenements de match (table EVENT).
 * Regle metier (business rules.md, "Event") : un but (TYPE_EVENT = 1, ADVERSAIRE = 0) dont JOUEUR1 vaut ce code
 * est un but contre son camp d'un joueur adverse (nom du buteur dans COMMENT). Ce code n'a pas de ligne JOUEURRG.
 */
export const OWN_GOAL_PLAYER_CODE = '0000';
