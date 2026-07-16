import { dbAll, dbGet, dbRun, type DbRunResult } from '../config/database';

export interface Terrain {
  TECLEUNIK: number;
  STADE: string;
  IDVILLE: number;
}

export interface TerrainWithVille extends Terrain {
  VILLE_NOM: string;
}

export interface DeletionError {
  canDelete: boolean;
  dependents: {
    table: string;
    count: number;
  }[];
}

/** Récupère tous les terrains avec les noms de ville. */
export async function getAllTerrains(): Promise<TerrainWithVille[]> {
  return dbAll<TerrainWithVille>(
    `SELECT t.TECLEUNIK, t.STADE, t.IDVILLE, v.NOM as VILLE_NOM
     FROM TERRAIN t
     LEFT JOIN VILLE v ON t.IDVILLE = v.VICLEUNIK
     ORDER BY t.STADE`,
  );
}

/** Récupère un terrain par ID. */
export async function getTerrainById(id: number): Promise<TerrainWithVille | undefined> {
  return dbGet<TerrainWithVille>(
    `SELECT t.TECLEUNIK, t.STADE, t.IDVILLE, v.NOM as VILLE_NOM
     FROM TERRAIN t
     LEFT JOIN VILLE v ON t.IDVILLE = v.VICLEUNIK
     WHERE t.TECLEUNIK = ?`,
    [id],
  );
}

/** Vérifie s'il y a des dépendances avant suppression. */
export async function checkDeletionDependencies(id: number): Promise<DeletionError> {
  const dependents: { table: string; count: number }[] = [];

  // Check MATCH table
  const matchResult = await dbGet<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM MATCH WHERE TECLEUNIK = ?`,
    [id],
  );
  if (matchResult && matchResult.cnt > 0) {
    dependents.push({ table: 'MATCH', count: matchResult.cnt });
  }

  return {
    canDelete: dependents.length === 0,
    dependents,
  };
}

/** Crée un nouveau terrain. */
export async function createTerrain(data: Omit<Terrain, 'TECLEUNIK'>): Promise<DbRunResult> {
  return dbRun(
    `INSERT INTO TERRAIN (STADE, IDVILLE) VALUES (?, ?)`,
    [data.STADE, data.IDVILLE],
  );
}

/** Met à jour un terrain. */
export async function updateTerrain(
  id: number,
  data: Partial<Omit<Terrain, 'TECLEUNIK'>>,
): Promise<DbRunResult> {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (data.STADE !== undefined) {
    updates.push('STADE = ?');
    values.push(data.STADE);
  }
  if (data.IDVILLE !== undefined) {
    updates.push('IDVILLE = ?');
    values.push(data.IDVILLE);
  }

  if (updates.length === 0) return { changes: 0 };

  values.push(id);
  return dbRun(`UPDATE TERRAIN SET ${updates.join(', ')} WHERE TECLEUNIK = ?`, values);
}

/** Supprime un terrain. */
export async function deleteTerrain(id: number): Promise<DbRunResult> {
  return dbRun(`DELETE FROM TERRAIN WHERE TECLEUNIK = ?`, [id]);
}
