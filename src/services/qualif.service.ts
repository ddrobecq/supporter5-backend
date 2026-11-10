import { createEntityService } from '../lib/baseService';
import { AppError } from '../types';

function sanitize(body: Record<string, unknown>): Record<string, unknown> {
  // CLASS_ID (pk) est toujours filtree, y compris en creation.
  const clean = { ...body };
  delete clean.CLASS_ID;

  if (typeof clean.CLASS_Libelle === 'string') {
    clean.CLASS_Libelle = clean.CLASS_Libelle.trim();
  }
  if (typeof clean.CLASS_Abrege === 'string') {
    clean.CLASS_Abrege = clean.CLASS_Abrege.trim();
  }

  return clean;
}

function parseIntegerField(value: unknown, field: string): number {
  const numeric = Number(value);
  if (!Number.isInteger(numeric)) {
    throw new AppError(400, `${field} doit etre un entier`);
  }
  return numeric;
}

function validateType(value: unknown): number {
  const parsed = parseIntegerField(value, 'CLASS_Type');
  if (parsed < 1 || parsed > 5) {
    throw new AppError(400, 'CLASS_Type doit etre compris entre 1 et 5');
  }
  return parsed;
}

function validatePayload(body: Record<string, unknown>, isCreate: boolean): Record<string, unknown> {
  const clean = sanitize(body);

  if (isCreate) {
    clean.CLASS_MinRang = parseIntegerField(clean.CLASS_MinRang, 'CLASS_MinRang');
    clean.CLASS_MaxRang = parseIntegerField(clean.CLASS_MaxRang, 'CLASS_MaxRang');
    clean.CLASS_Couleur = parseIntegerField(clean.CLASS_Couleur, 'CLASS_Couleur');
    clean.CLASS_Type = validateType(clean.CLASS_Type);
    clean.TUCLEUNIK = parseIntegerField(clean.TUCLEUNIK, 'TUCLEUNIK');

    const abrege = String(clean.CLASS_Abrege ?? '').trim();
    if (!abrege) {
      throw new AppError(400, 'CLASS_Abrege est requis');
    }
    clean.CLASS_Abrege = abrege;
  } else {
    if (clean.CLASS_MinRang !== undefined) {
      clean.CLASS_MinRang = parseIntegerField(clean.CLASS_MinRang, 'CLASS_MinRang');
    }
    if (clean.CLASS_MaxRang !== undefined) {
      clean.CLASS_MaxRang = parseIntegerField(clean.CLASS_MaxRang, 'CLASS_MaxRang');
    }
    if (clean.CLASS_Couleur !== undefined) {
      clean.CLASS_Couleur = parseIntegerField(clean.CLASS_Couleur, 'CLASS_Couleur');
    }
    if (clean.CLASS_Type !== undefined) {
      clean.CLASS_Type = validateType(clean.CLASS_Type);
    }
    if (clean.CLASS_Abrege !== undefined) {
      const abrege = String(clean.CLASS_Abrege ?? '').trim();
      if (!abrege) {
        throw new AppError(400, 'CLASS_Abrege est requis');
      }
      clean.CLASS_Abrege = abrege;
    }
    if (clean.TUCLEUNIK !== undefined) {
      clean.TUCLEUNIK = parseIntegerField(clean.TUCLEUNIK, 'TUCLEUNIK');
    }
  }

  const min = clean.CLASS_MinRang as number | undefined;
  const max = clean.CLASS_MaxRang as number | undefined;
  if (min !== undefined && max !== undefined && max < min) {
    throw new AppError(400, 'CLASS_MaxRang doit etre superieur ou egal a CLASS_MinRang');
  }

  return clean;
}

export default createEntityService({
  table: 'Qualif',
  pk: 'CLASS_ID',
  selectCols: [
    'CLASS_ID',
    'CLASS_MinRang',
    'CLASS_MaxRang',
    'CLASS_Couleur',
    'CLASS_Libelle',
    'CLASS_Type',
    'TUCLEUNIK',
    'CLASS_Abrege',
  ],
  allowedSortCols: ['CLASS_ID', 'CLASS_MinRang', 'CLASS_MaxRang', 'CLASS_Type', 'TUCLEUNIK'],
  searchCols: ['CLASS_Libelle', 'CLASS_Abrege'],
  filterCols: ['TUCLEUNIK', 'CLASS_Type'],
  prepareWrite: (body, mode) => validatePayload(body, mode === 'create'),
});
