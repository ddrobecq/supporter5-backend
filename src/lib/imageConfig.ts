/**
 * Whitelist des entités exposant une image via /api/images/:entity/:id
 * Ajouter ici chaque nouvelle table avec photo/logo.
 */
export interface ImageConfig {
  table: string;
  pk: string;
  field: string;
}

export const IMAGE_CONFIGS: Record<string, ImageConfig> = {
  arbitre:  { table: 'ARBITRE',  pk: 'IDARBITRE', field: 'ARB_PHOTO' },
  epreuve:  { table: 'EPREUVE',  pk: 'IDEPREUVE', field: 'EPR_VISUEL' },
  club:     { table: 'CLUB',     pk: 'IDCLUB',    field: 'ECUSSON' },
  joueurrg: { table: 'JOUEURRG', pk: 'IDJOUEUR',  field: 'PHOTO' },
};
