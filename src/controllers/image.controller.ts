import type { Request, Response } from 'express';
import { getEntityImage } from '../lib/imageService';

/**
 * GET /api/images/:entity/:id
 *
 * Retourne l'image associée à une entité (ARBITRE, CLUB, JOUEURRG…)
 * en binaire avec le bon Content-Type, pour un chargement asynchrone.
 */
export async function getImage(req: Request, res: Response): Promise<void> {
  const { entity, id } = req.params;

  console.log(`[API] GET /api/images/${entity}/${id}`);

  if (!entity || !id) {
    console.warn(`[API] Missing parameters`);
    res.status(400).json({ message: 'Paramètres manquants.' });
    return;
  }

  const result = await getEntityImage(entity, id);

  if (!result) {
    console.warn(`[API] Image not found for ${entity}#${id}`);
    res.status(404).json({ message: 'Image introuvable.' });
    return;
  }

  const maxAge = 60 * 60 * 24; // 24 h
  res.setHeader('Content-Type', result.mimeType);
  res.setHeader('Content-Length', result.buffer.length);
  res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  console.log(`[API] ✓ Sending ${result.buffer.length} bytes with Content-Type: ${result.mimeType}`);
  res.end(result.buffer);
}
