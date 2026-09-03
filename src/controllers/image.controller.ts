import { createHash } from 'crypto';
import type { Request, Response } from 'express';
import { getEntityImage, setEntityImage } from '../lib/imageService';

/**
 * GET /api/images/:entity/:id
 *
 * Retourne l'image associée à une entité (ARBITRE, CLUB, JOUEURRG…)
 * en binaire avec le bon Content-Type, pour un chargement asynchrone.
 */
export async function getImage(req: Request, res: Response): Promise<void> {
  const { entity, id } = req.params;

  if (!entity || !id) {
    res.status(400).json({ message: 'Paramètres manquants.' });
    return;
  }

  const result = await getEntityImage(entity, id);

  if (!result) {
    res.status(404).json({ message: 'Image introuvable.' });
    return;
  }

  // L'image peut changer sans que l'URL ne change (pas de parametre de version garanti
  // apres un rechargement complet) : on force la revalidation a chaque requete et on
  // s'appuie sur l'ETag pour eviter de retransferer une image inchangee.
  const etag = `"${createHash('sha1').update(result.buffer).digest('hex')}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'no-cache');

  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }

  res.setHeader('Content-Type', result.mimeType);
  res.setHeader('Content-Length', result.buffer.length);
  res.end(result.buffer);
}

/**
 * PUT /api/admin/images/:entity/:id
 * Body: { image: string | null }
 */
export async function updateImage(req: Request, res: Response): Promise<void> {
  const { entity, id } = req.params;

  if (!entity || !id) {
    res.status(400).json({ message: 'Paramètres manquants.' });
    return;
  }

  const body = req.body as { image?: unknown };
  if (!Object.prototype.hasOwnProperty.call(body ?? {}, 'image')) {
    res.status(400).json({ message: 'Champ image manquant.' });
    return;
  }

  const updated = await setEntityImage(entity, id, body.image);
  if (!updated) {
    res.status(404).json({ message: 'Entité ou image introuvable.' });
    return;
  }

  res.status(204).send();
}
