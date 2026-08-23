import { dbAll, dbGet, dbRun } from '../config/database';
import { importRencontresForTour, type ImportRencontreRow } from './rencontres.service';
import { AppError } from '../types';

export interface ImportAssociationRow {
  IDImportAssociation: number;
  IMP_NomClub: string;
  IMP_IDCLUB: string;
  CLUB: string | null;
}

/** Correspondances "nom de club tel qu'ecrit dans un fichier importe" -> IDCLUB de la base. */
export async function getImportAssociations(): Promise<ImportAssociationRow[]> {
  return dbAll<ImportAssociationRow>(
    `SELECT
       ia."IDImportAssociation",
       COALESCE(ia."IMP_NomClub", '') AS "IMP_NomClub",
       COALESCE(ia."IMP_IDCLUB", '') AS "IMP_IDCLUB",
       c."CLUB"
     FROM "ImportAssociation" ia
     LEFT JOIN "CLUB" c ON c."IDCLUB" = ia."IMP_IDCLUB"
     WHERE TRIM(COALESCE(ia."IMP_NomClub", '')) <> ''
     ORDER BY ia."IMP_NomClub" ASC`,
  );
}

export async function saveImportAssociation(nomClubInput: string, clubIdInput: string): Promise<ImportAssociationRow> {
  const nomClub = String(nomClubInput ?? '').trim();
  const clubId = String(clubIdInput ?? '').trim();
  if (!nomClub) throw new AppError(400, 'Nom de club du fichier requis.');
  if (!clubId) throw new AppError(400, 'Club cible requis.');

  const club = await dbGet<{ IDCLUB: string }>('SELECT "IDCLUB" FROM "CLUB" WHERE "IDCLUB" = ?', [clubId]);
  if (!club) throw new AppError(404, 'Club introuvable.');

  const existing = await dbGet<{ IDImportAssociation: number }>(
    'SELECT "IDImportAssociation" FROM "ImportAssociation" WHERE TRIM(COALESCE("IMP_NomClub", \'\')) = ? LIMIT 1',
    [nomClub],
  );

  if (existing) {
    await dbRun('UPDATE "ImportAssociation" SET "IMP_IDCLUB" = ? WHERE "IDImportAssociation" = ?', [clubId, existing.IDImportAssociation]);
  } else {
    await dbRun('INSERT INTO "ImportAssociation" ("IMP_NomClub", "IMP_IDCLUB") VALUES (?, ?)', [nomClub, clubId]);
  }

  const saved = await dbGet<ImportAssociationRow>(
    `SELECT
       ia."IDImportAssociation",
       COALESCE(ia."IMP_NomClub", '') AS "IMP_NomClub",
       COALESCE(ia."IMP_IDCLUB", '') AS "IMP_IDCLUB",
       c."CLUB"
     FROM "ImportAssociation" ia
     LEFT JOIN "CLUB" c ON c."IDCLUB" = ia."IMP_IDCLUB"
     WHERE TRIM(COALESCE(ia."IMP_NomClub", '')) = ?
     LIMIT 1`,
    [nomClub],
  );
  if (!saved) throw new AppError(500, 'Association introuvable apres enregistrement.');
  return saved;
}

export async function importRencontres(
  tourId: string | number,
  saison: string,
  rows: ImportRencontreRow[],
): Promise<{ imported: number }> {
  return importRencontresForTour(tourId, saison, rows);
}

export default { getImportAssociations, saveImportAssociation, importRencontres };
