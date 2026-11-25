/** Public front routes tracked by the audience counter (front/src/App.tsx, public layout). */

export type TrackedEntityType = '' | 'club' | 'joueur' | 'rencontre';

export interface TrackedPath {
  path: string;
  entityType: TrackedEntityType;
  /** Id exactly as found in the path (e.g. '0001' for clubs and players), null for fixed pages. */
  entityId: string | null;
}

export const MAX_TRACKED_PATH_LENGTH = 300;

/** Business labels of the fixed public pages. */
export const FIXED_PAGE_LABELS: Readonly<Record<string, string>> = {
  '/': 'Accueil',
  '/calendrier': 'Calendrier',
  '/statistiques': 'Statistiques',
  '/parametres': 'Paramètres',
};

const ENTITY_PATH_PATTERN = /^\/(clubs|joueurs|rencontres)\/(\d+)$/;
const ENTITY_TYPES: Readonly<Record<string, TrackedEntityType>> = {
  clubs: 'club',
  joueurs: 'joueur',
  rencontres: 'rencontre',
};

/** Tracked page of `path` (pathname only, no query nor trailing slash), or null when it is not a known public route. */
export function parseTrackedPath(path: string): TrackedPath | null {
  if (path.length > MAX_TRACKED_PATH_LENGTH) return null;
  if (Object.hasOwn(FIXED_PAGE_LABELS, path)) return { path, entityType: '', entityId: null };
  const match = ENTITY_PATH_PATTERN.exec(path);
  if (!match) return null;
  return { path, entityType: ENTITY_TYPES[match[1]], entityId: match[2] };
}
