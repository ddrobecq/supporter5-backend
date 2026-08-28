import type { NextFunction, Request, Response } from 'express';
import { getActualiteImage, getActualites } from '../services/actualites.service';

export async function listActualites(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({ data: await getActualites() });
  } catch (error) {
    next(error);
  }
}

export async function getActualiteImageHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const image = await getActualiteImage(String(req.params.id ?? ''));
    if (!image) {
      res.status(404).send();
      return;
    }
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=900');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.status(200).send(image);
  } catch (error) {
    next(error);
  }
}