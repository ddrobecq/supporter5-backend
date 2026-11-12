import { checkFkConstraints, type FkConstraintSpec, type IntegrityChecker } from './fkIntegrity';

/**
 * Tables referencing each entity, checked by /:id/can-delete and before DELETE /:id (409).
 * The order of the specs is the order of the constraints in the responses.
 * Owned tables deleted together with the record (CLUB_NOM, CLUB_TERRAIN for a club) are not listed.
 */
export const FK_DEPENDENCIES = {
  arbitre: [
    { table: 'MATCH', column: 'IDARBITRE', description: (n) => `${n} match(s) arbitré(s) par cet arbitre` },
  ],
  circ: [
    { table: 'RENCO', column: 'IDCIRC', description: (n) => `${n} rencontre(s) utilisent cette circonstance` },
  ],
  club: [
    { table: 'RENCO', column: 'DOMICILE', description: (n) => `${n} rencontre(s) avec ce club comme domicile` },
    { table: 'RENCO', column: 'EXTERIEUR', description: (n) => `${n} rencontre(s) avec ce club comme exterieur` },
    { table: 'PARTICIP', column: 'IDCLUB', description: (n) => `${n} participation(s) de ce club` },
    { table: 'TRANSAC', column: 'IDCLUB', description: (n) => `${n} transaction(s) liee(s) a ce club` },
    { table: 'JOTRO', column: 'IDCLUB', description: (n) => `${n} trophee(s) de joueur(s) associe(s) a ce club` },
  ],
  competition: [
    { table: 'TOUR', column: 'COCLEUNIK', description: (n) => `${n} tour(s) utilisent cette competition` },
  ],
  devise: [
    { table: 'TRANSAC', column: 'DVCLEUNIK', description: (n) => `${n} transaction(s) utilisant cette devise` },
  ],
  epreuve: [
    { table: 'COMPET', column: 'IDEPREUVE', description: (n) => `${n} compétition(s) utilisent cette épreuve` },
  ],
  joueur: [
    { table: 'JOUEUR', column: 'IDJOUEUR', description: (n) => `${n} statistique(s) de saison pour ce joueur` },
    { table: 'BLESSURE', column: 'IDJOUEUR', description: (n) => `${n} blessure(s) liée(s) à ce joueur` },
    { table: 'TRANSAC', column: 'IDJOUEUR', description: (n) => `${n} transaction(s) liée(s) à ce joueur` },
    { table: 'JOTRO', column: 'IDJOUEUR', description: (n) => `${n} trophée(s) individuel(s) pour ce joueur` },
  ],
  natio: [
    { table: 'ARBITRE', column: 'IDNATIO', description: (n) => `${n} arbitre(s) de cette nationalite` },
    { table: 'CLUB', column: 'IDNATIO', description: (n) => `${n} club(s) de cette nationalite` },
    { table: 'JOUEURRG', column: 'IDNATIO', description: (n) => `${n} joueur(s) de cette nationalite` },
    { table: 'VILLE', column: 'IDNATIO', description: (n) => `${n} ville(s) de ce pays` },
  ],
  /** No table references RSS: can-delete always answers { canDelete: true, constraints: [] }. */
  rss: [],
  saison: [
    { table: 'COMPET', column: 'SAISON', description: (n) => `${n} compétition(s) de cette saison` },
    { table: 'JOUEUR', column: 'SAISON', description: (n) => `${n} statistique(s) de joueur(s) pour cette saison` },
    { table: 'RENCO', column: 'SAISON', description: (n) => `${n} rencontre(s) de cette saison` },
    { table: 'TRANSAC', column: 'SAISON', description: (n) => `${n} transaction(s) de cette saison` },
    { table: 'JOTRO', column: 'SAISON', description: (n) => `${n} trophée(s) individuel(s) de cette saison` },
  ],
  terrain: [
    { table: 'CLUB_TERRAIN', column: 'TECLEUNIK', description: (n) => `${n} liaison(s) club-terrain utilisent ce terrain` },
    { table: 'MATCH', column: 'TECLEUNIK', description: (n) => `${n} match(es) planifié(s) sur ce terrain` },
  ],
  tour: [
    { table: 'PARTICIP', column: 'TUCLEUNIK', description: (n) => `${n} participation(s) utilisent ce tour` },
    { table: 'Qualif', column: 'TUCLEUNIK', description: (n) => `${n} qualification(s) utilisent ce tour` },
    { table: 'RENCO', column: 'TUCLEUNIK', description: (n) => `${n} rencontre(s) utilisent ce tour` },
  ],
  tourdef: [
    { table: 'TOUR', column: 'TDCLEUNIK', description: (n) => `${n} tour(s) utilisent cette définition de tour` },
  ],
  ville: [
    { table: 'CLUB', column: 'IDVILLE', description: (n) => `${n} club(s) basé(s) dans cette ville` },
    { table: 'JOUEURRG', column: 'IDVILLE', description: (n) => `${n} dossier(s) de joueur(s) avec cette ville` },
    { table: 'TERRAIN', column: 'IDVILLE', description: (n) => `${n} terrain(s) situé(s) dans cette ville` },
  ],
} as const satisfies Record<string, readonly FkConstraintSpec[]>;

export type IntegrityEntity = keyof typeof FK_DEPENDENCIES;

/** Can-delete checker of an entity, driven by FK_DEPENDENCIES. */
export function integrityCheckerFor(entity: IntegrityEntity): IntegrityChecker {
  const specs: readonly FkConstraintSpec[] = FK_DEPENDENCIES[entity];
  return (id) => checkFkConstraints(specs, id);
}
