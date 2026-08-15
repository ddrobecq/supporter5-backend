import db from '../config/database';

export interface ClubLatestTerrainRow {
  TERRAIN_ID: string;
  TERRAIN_NOM: string;
  TERRAIN_VILLE: string;
}

export function getLatestTerrainForClub(clubId: unknown): ClubLatestTerrainRow | null {
  const normalizedClubId = String(clubId ?? '').trim();
  if (!normalizedClubId) {
    return null;
  }

  const row = db.prepare(
    `SELECT
       NULLIF(TRIM(CAST(ct."TECLEUNIK" AS TEXT)), '') AS TERRAIN_ID,
       COALESCE(t."STADE", '') AS TERRAIN_NOM,
       COALESCE(v."NOM", '') AS TERRAIN_VILLE
     FROM "CLUB_TERRAIN" ct
     LEFT JOIN "TERRAIN" t ON t."TECLEUNIK" = ct."TECLEUNIK"
     LEFT JOIN "VILLE" v ON v."VICLEUNIK" = t."IDVILLE"
     WHERE ct."IDCLUB" = ?
       AND NULLIF(TRIM(CAST(ct."TECLEUNIK" AS TEXT)), '') IS NOT NULL
     ORDER BY REPLACE(COALESCE(ct."DATE", ''), '-', '') DESC, ct."CT_CLEUNIK" DESC
     LIMIT 1`,
  ).get(normalizedClubId) as Record<string, unknown> | undefined;

  const terrainId = String(row?.TERRAIN_ID ?? '').trim();
  if (!terrainId) {
    return null;
  }

  return {
    TERRAIN_ID: terrainId,
    TERRAIN_NOM: String(row?.TERRAIN_NOM ?? '').trim(),
    TERRAIN_VILLE: String(row?.TERRAIN_VILLE ?? '').trim(),
  };
}