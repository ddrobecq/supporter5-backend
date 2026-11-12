import { CIRC_COMPLET_JOINS, CIRC_COMPLET_SELECT, type CircCompletResolver, type CircCompletSourceRow } from './circComplet';
import { getLatestTerrainForClub } from './clubTerrain';
import { scopeFilterClause, scopeFilterJoins } from './matchScopeFilter';

/**
 * Match OFFICIEL : rencontre non amicale (TUCLEUNIK <> 0) dont la competition appartient a une EPREUVE
 * officielle (OFFICIELLE <> 0). EXISTS sur les cles primaires TOUR -> COMPET -> EPREUVE : s'insere dans
 * n'importe quelle requete sans dupliquer de lignes ni entrer en conflit avec les alias existants.
 * `rencoAlias` = alias de RENCO dans la requete appelante.
 */
export function officialMatchSql(rencoAlias: string): string {
  return `${rencoAlias}.TUCLEUNIK <> 0
        AND EXISTS (
          SELECT 1 FROM TOUR off_t
          INNER JOIN COMPET off_co ON off_co.COCLEUNIK = off_t.COCLEUNIK
          INNER JOIN EPREUVE off_ep ON off_ep.IDEPREUVE = off_co.IDEPREUVE
          WHERE off_t.TUCLEUNIK = ${rencoAlias}.TUCLEUNIK AND off_ep.OFFICIELLE <> 0
        )`;
}

/**
 * Meme prédicat que officialMatchSql, pour une requete qui contient deja scopeFilterJoins(rencoAlias)
 * (LEFT JOIN TOUR st_t / COMPET st_co / EPREUVE st_ep) : reutilise st_ep au lieu d'une sous-requete correlee.
 * Sans epreuve, st_ep.OFFICIELLE est NULL et la ligne est exclue, comme avec l'EXISTS.
 */
export function officialMatchWithScopeJoinsSql(rencoAlias: string): string {
  return `${rencoAlias}.TUCLEUNIK <> 0 AND st_ep.OFFICIELLE <> 0`;
}

/**
 * Match JOUE : ETAT = 3 (termine). Les matchs programmes (ETAT 1 / 5) et non joues (ETAT 4) sont exclus.
 * Independant du caractere officiel. ETAT est NOT NULL.
 * Le `+` unaire ne change pas le resultat : il empeche SQLite d'utiliser WDIDX_RENCO_ETAT, peu selectif
 * (~99 % des rencontres sont a ETAT = 3, sans statistiques ANALYZE), au detriment des index DOMICILE /
 * EXTERIEUR ou MATCH -> RENCO ; ETAT reste un simple filtre.
 */
export function playedMatchSql(rencoAlias: string): string {
  return `+${rencoAlias}.ETAT = 3`;
}

/** Colonnes communes aux listes de rencontres du club supporte (stats/rencontre scores, sanctions, affluence). */
export interface SupportedMatchQueryRow extends CircCompletSourceRow {
  RECLEUNIK: number;
  DATE: string;
  DOMICILE: string;
  EXTERIEUR: string;
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
  DOMICILE_IDNATIO: string | null;
  EXTERIEUR_IDNATIO: string | null;
  TERRAIN_NOM: string;
}

/**
 * SELECT des rencontres officielles et jouees du club supporte, avec les colonnes de SupportedMatchQueryRow
 * puis `extraSelect`. Parametres a lier, dans l'ordre : ceux de `extraSelect`, club supporte x2, puis `scope`
 * s'il est non nul. Pas d'ORDER BY (a ajouter par l'appelant).
 */
export function supportedMatchesSql(options: {
  extraSelect: readonly string[];
  matchJoin: 'INNER' | 'LEFT';
  extraWhere?: string;
  scope?: number | null;
}): string {
  return `SELECT
       r.RECLEUNIK,
       COALESCE(r.DATE, '') AS DATE,
       r.DOMICILE,
       r.EXTERIEUR,
       COALESCE(cd.CLUB, r.DOMICILE, '') AS DOMICILE_NOM,
       COALESCE(ce.CLUB, r.EXTERIEUR, '') AS EXTERIEUR_NOM,
       cd.IDNATIO AS DOMICILE_IDNATIO,
       ce.IDNATIO AS EXTERIEUR_IDNATIO,
       COALESCE(te.STADE, '') AS TERRAIN_NOM,
       ${[...options.extraSelect, CIRC_COMPLET_SELECT].join(',\n       ')}
     FROM RENCO r
     ${CIRC_COMPLET_JOINS}
     ${scopeFilterJoins()}
     ${options.matchJoin} JOIN MATCH m ON m.RECLEUNIK = r.RECLEUNIK
     LEFT JOIN TERRAIN te ON te.TECLEUNIK = m.TECLEUNIK
     LEFT JOIN CLUB cd ON cd.IDCLUB = r.DOMICILE
     LEFT JOIN CLUB ce ON ce.IDCLUB = r.EXTERIEUR
     WHERE ${officialMatchWithScopeJoinsSql('r')}
       AND ${playedMatchSql('r')}
       AND (r.DOMICILE = ? OR r.EXTERIEUR = ?)
       ${options.extraWhere ?? ''}
       ${scopeFilterClause(options.scope)}`;
}

/** Nom du dernier terrain connu d'un club, resolu une seule fois par club (evite un SELECT par ligne). */
export function createLatestTerrainNameResolver(): (clubId: unknown) => string {
  const cache = new Map<string, string>();
  return (clubId) => {
    const key = String(clubId ?? '');
    let name = cache.get(key);
    if (name === undefined) {
      name = getLatestTerrainForClub(clubId)?.TERRAIN_NOM ?? '';
      cache.set(key, name);
    }
    return name;
  };
}

export interface SupportedMatchFields {
  RECLEUNIK: number;
  DATE: string;
  CIRC_COMPLET: string;
  TERRAIN_NOM: string;
  ADVERSAIRE_ID: string;
  ADVERSAIRE_NOM: string;
  ADVERSAIRE_IDNATIO: string | null;
}

/**
 * Champs communs d'une rencontre du club supporte : adversaire, terrain (MATCH.TECLEUNIK, sinon dernier
 * terrain du club a domicile), nations. `withSideNames` ajoute DOMICILE_NOM / EXTERIEUR_NOM apres TERRAIN_NOM.
 */
export interface SupportedMatchContext {
  supportedClubId: string;
  circ: CircCompletResolver;
  latestTerrainName: (clubId: unknown) => string;
}

export function mapSupportedMatchRow(
  row: SupportedMatchQueryRow,
  context: SupportedMatchContext,
  options: { withSideNames: true },
): SupportedMatchFields & { DOMICILE_NOM: string; EXTERIEUR_NOM: string };
export function mapSupportedMatchRow(row: SupportedMatchQueryRow, context: SupportedMatchContext): SupportedMatchFields;
export function mapSupportedMatchRow(
  row: SupportedMatchQueryRow,
  context: SupportedMatchContext,
  options: { withSideNames?: boolean } = {},
): SupportedMatchFields {
  const isHome = String(row.DOMICILE ?? '') === context.supportedClubId;
  const terrain = String(row.TERRAIN_NOM ?? '').trim() || context.latestTerrainName(row.DOMICILE) || '';
  return {
    RECLEUNIK: Number(row.RECLEUNIK),
    DATE: String(row.DATE ?? ''),
    CIRC_COMPLET: context.circ.circComplet(row),
    TERRAIN_NOM: terrain,
    ...(options.withSideNames
      ? { DOMICILE_NOM: String(row.DOMICILE_NOM ?? ''), EXTERIEUR_NOM: String(row.EXTERIEUR_NOM ?? '') }
      : {}),
    ADVERSAIRE_ID: String((isHome ? row.EXTERIEUR : row.DOMICILE) ?? ''),
    ADVERSAIRE_NOM: String((isHome ? row.EXTERIEUR_NOM : row.DOMICILE_NOM) ?? ''),
    ADVERSAIRE_IDNATIO: (isHome ? row.EXTERIEUR_IDNATIO : row.DOMICILE_IDNATIO) ?? null,
  };
}
