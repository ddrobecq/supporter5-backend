import type { Request, Response } from 'express';
import {
  getAllTerrains,
  getTerrainById,
  createTerrain,
  updateTerrain,
  deleteTerrain,
  checkDeletionDependencies,
  type Terrain,
} from '../services/terrain.service';

/** GET /api/terrains */
export async function listTerrains(req: Request, res: Response): Promise<void> {
  try {
    const terrains = await getAllTerrains();
    res.json(terrains);
  } catch (error) {
    console.error('[TERRAIN] Error listing terrains:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des terrains' });
  }
}

/** GET /api/terrains/:id */
export async function getTerrain(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const terrain = await getTerrainById(Number(id));

    if (!terrain) {
      res.status(404).json({ message: 'Terrain non trouvé' });
      return;
    }

    res.json(terrain);
  } catch (error) {
    console.error('[TERRAIN] Error fetching terrain:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération du terrain' });
  }
}

/** POST /api/terrains */
export async function createTerrainHandler(req: Request, res: Response): Promise<void> {
  try {
    const { STADE, IDVILLE } = req.body as Record<string, unknown>;

    if (!STADE || !IDVILLE) {
      res.status(400).json({ message: 'STADE et IDVILLE sont obligatoires' });
      return;
    }

    const result = await createTerrain({
      STADE: String(STADE),
      IDVILLE: Number(IDVILLE),
    });

    res.status(201).json({ message: 'Terrain créé', lastInsertRowid: result.lastInsertRowid });
  } catch (error) {
    console.error('[TERRAIN] Error creating terrain:', error);
    res.status(500).json({ message: 'Erreur lors de la création du terrain' });
  }
}

/** PUT /api/terrains/:id */
export async function updateTerrainHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { STADE, IDVILLE } = req.body as Record<string, unknown>;

    const result = await updateTerrain(Number(id), {
      STADE: STADE ? String(STADE) : undefined,
      IDVILLE: IDVILLE ? Number(IDVILLE) : undefined,
    });

    if (result.changes === 0) {
      res.status(404).json({ message: 'Terrain non trouvé' });
      return;
    }

    res.json({ message: 'Terrain mis à jour' });
  } catch (error) {
    console.error('[TERRAIN] Error updating terrain:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du terrain' });
  }
}

/** DELETE /api/terrains/:id */
export async function deleteTerrainHandler(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Vérifier les dépendances
    const deps = await checkDeletionDependencies(Number(id));
    if (!deps.canDelete) {
      res.status(409).json({
        message: `Impossible de supprimer ce terrain. Il est utilisé par ${deps.dependents.map((d) => `${d.count} enregistrement(s) dans ${d.table}`).join(', ')}`,
        dependents: deps.dependents,
      });
      return;
    }

    const result = await deleteTerrain(Number(id));

    if (result.changes === 0) {
      res.status(404).json({ message: 'Terrain non trouvé' });
      return;
    }

    res.json({ message: 'Terrain supprimé' });
  } catch (error) {
    console.error('[TERRAIN] Error deleting terrain:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du terrain' });
  }
}
