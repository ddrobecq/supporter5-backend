import { Router } from 'express';
import multer from 'multer';
import ctrl from '../../controllers/system.controller';
import { AppError } from '../../types';

const router = Router();

function getUploadMaxBytes(): number {
  const configuredMb = Number.parseInt(process.env.SQLITE_UPLOAD_MAX_MB ?? '', 10);
  const mb = Number.isFinite(configuredMb) && configuredMb > 0 ? configuredMb : 512;
  return mb * 1024 * 1024;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: getUploadMaxBytes(),
  },
});

router.post('/database/upload', (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      const maxMb = Math.floor(getUploadMaxBytes() / (1024 * 1024));
      next(new AppError(413, `Fichier trop volumineux. Taille maximale: ${maxMb}MB.`));
      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
}, ctrl.uploadDatabaseHandler);
router.post('/restart', ctrl.restartBackendHandler);

export default router;
