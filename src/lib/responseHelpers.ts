import type { Response } from 'express';

export function sendNotFound(res: Response): void {
  res.status(404).json({ message: 'Not found' });
}
