/**
 * Postes de la table EQUIPE (composition du club supporte pour un match).
 * Regle metier (business rules.md, "Calcul des statistiques" / "Participation a un Match") :
 * un joueur a joue un match s'il est TITULAIRE (poste de champ, hors REMPx) ou s'il est ENTRE EN JEU
 * (EVENT TYPE_EVENT = 2, JOUEUR2 = le joueur). Etre sur le banc (REMPx) sans entrer ne compte pas.
 */

/** Postes de champ, dans l'ordre des colonnes d'EQUIPE. */
export const STARTER_SLOTS = [
  'GOAL', 'DLG', 'DLD', 'DCG', 'DCD', 'LIB', 'STO',
  'MDLD', 'MDLG', 'MDCD', 'MDCG', 'MOLD', 'MOLG', 'MOCD', 'MOCG', 'MOCC', 'MDCC',
  'ALD', 'ALG', 'ACD', 'ACG', 'AVC',
] as const;

/** Remplacants (banc). */
export const SUB_SLOTS = [
  'REMP1', 'REMP2', 'REMP3', 'REMP4', 'REMP5', 'REMP6',
  'REMP7', 'REMP8', 'REMP9', 'REMP10', 'REMP11',
] as const;

/** Tous les postes joueurs d'EQUIPE (hors ENTRAINEUR), dans l'ordre des colonnes. */
export const ALL_SLOTS = [...STARTER_SLOTS, ...SUB_SLOTS] as const;

export type StarterSlot = typeof STARTER_SLOTS[number];

/** Postes de champ groupes par ligne tactique, du gardien vers l'attaque (memes postes que STARTER_SLOTS). */
export const STARTER_LINES = [
  { key: 'GARDIEN', slots: ['GOAL'] },
  { key: 'DEFENSE', slots: ['DLG', 'DLD', 'DCG', 'DCD', 'LIB', 'STO'] },
  { key: 'MIL_DEFENSIF', slots: ['MDLD', 'MDLG', 'MDCD', 'MDCG', 'MDCC'] },
  { key: 'MIL_OFFENSIF', slots: ['MOLD', 'MOLG', 'MOCD', 'MOCG', 'MOCC'] },
  { key: 'ATTAQUE', slots: ['ALD', 'ALG', 'ACD', 'ACG', 'AVC'] },
] as const satisfies ReadonlyArray<{ key: string; slots: readonly StarterSlot[] }>;

/**
 * SELECT des couples (IDJOUEUR, MACLEUNIK) des matchs reellement joues par les joueurs du club supporte :
 * titulaires (postes de champ d'EQUIPE) UNION entrants en jeu (EVENT TYPE_EVENT = 2, ADVERSAIRE = 0, JOUEUR2).
 * UNION (et non UNION ALL) : un couple present a la fois comme titulaire et comme entrant ne compte qu'une fois.
 * A utiliser dans un CTE : `WITH player_matches AS (${playedMatchesSql()})`.
 */
export function playedMatchesSql(): string {
  const starters = STARTER_SLOTS.map(
    (slot) => `SELECT ${slot} AS IDJOUEUR, MACLEUNIK FROM EQUIPE WHERE ${slot} IS NOT NULL AND TRIM(${slot}) <> ''`,
  );
  const entrants = `SELECT ev.JOUEUR2, ev.MACLEUNIK FROM EVENT ev
        WHERE ev.TYPE_EVENT = 2 AND ev.ADVERSAIRE = 0
          AND ev.JOUEUR2 IS NOT NULL AND TRIM(ev.JOUEUR2) <> ''`;
  return [...starters, entrants].join('\n      UNION ');
}
