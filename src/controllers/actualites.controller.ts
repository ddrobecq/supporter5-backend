import { asyncHandler, dataHandler } from '../lib/responseHelpers';
import { getActualiteImage, getActualites } from '../services/actualites.service';

export const listActualites = dataHandler(() => getActualites());

export const getActualiteImageHandler = asyncHandler(async (req, res) => {
  const image = await getActualiteImage(String(req.params.id ?? ''));
  if (!image) {
    res.status(404).send();
    return;
  }
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=900');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.status(200).send(image);
});
