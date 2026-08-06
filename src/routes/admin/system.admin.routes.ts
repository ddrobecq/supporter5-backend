import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ctrl from '../../controllers/system.controller';
import { AppError } from '../../types';

const router = Router();

function getUploadMaxBytes(): number {
  const configuredMb = Number.parseInt(process.env.SQLITE_UPLOAD_MAX_MB ?? '', 10);
  const mb = Number.isFinite(configuredMb) && configuredMb > 0 ? configuredMb : 512;
  return mb * 1024 * 1024;
}

function resolveUploadTempDir(): string {
  const configured = (process.env.SQLITE_UPLOAD_TMP_DIR ?? '').trim();
  const tempDir = configured
    ? (path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured))
    : path.join(os.tmpdir(), 'supporter-upload');

  fs.mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

const uploadTempDir = resolveUploadTempDir();

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadTempDir);
  },
  filename: (_req, file, cb) => {
    const safeName = String(file.originalname ?? 'database.sqlite').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage: uploadStorage,
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
router.get('/version', ctrl.versionHandler);

export default router;
