import db from '../config/database';

/**
 * Dates d'un tour derivees de ses rencontres : DATE_DEBUT = MIN(RENCO.DATE), DATE_FIN = MAX(RENCO.DATE)
 * sur les rencontres datees (DATE non vide) du tour. Un tour sans rencontre datee garde ses dates saisies.
 * Une seule requete ensembliste pour les tours donnes (0 / null / doublons ignores) ; seules les lignes
 * qui changent sont ecrites. A appeler dans la transaction de l'ecriture RENCO.
 */
export function recomputeTourDates(tourIds: ReadonlyArray<number | null | undefined>): void {
  const ids = [...new Set(tourIds.filter((id): id is number => Number.isInteger(id) && (id as number) > 0))];
  if (ids.length === 0) {
    return;
  }

  const marks = ids.map(() => '?').join(', ');
  db.prepare(
    `WITH b AS (
       SELECT r."TUCLEUNIK" AS t, MIN(r."DATE") AS d1, MAX(r."DATE") AS d2
       FROM "RENCO" r
       WHERE COALESCE(r."DATE", '') <> ''
         AND r."TUCLEUNIK" IN (${marks})
       GROUP BY r."TUCLEUNIK"
     )
     UPDATE "TOUR"
     SET "DATE_DEBUT" = b.d1, "DATE_FIN" = b.d2
     FROM b
     WHERE b.t = "TOUR"."TUCLEUNIK"
       AND ("TOUR"."DATE_DEBUT" IS NOT b.d1 OR "TOUR"."DATE_FIN" IS NOT b.d2)`,
  ).run(...ids);
}
