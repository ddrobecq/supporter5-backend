import db, { dbGet } from '../config/database';
import { createEntityService } from '../lib/baseService';
import { normalizeSaison } from '../lib/saisonRules';
import { clonePreviousCompetition, createCompetitionFromPrevious } from './competition.service';
import { AppError } from '../types';

const baseService = createEntityService({
  table:           'SAISON',
  pk:              'SAISON',
  selectCols:      ['SAISON', 'SA_DEBUT', 'SA_FIN'],
  allowedSortCols: ['SAISON', 'SA_DEBUT', 'SA_FIN'],
  searchCols:      ['SAISON'],
  filterCols:      [],
});

function normalizeIsoDate(value: unknown, fieldName: string): string {
  const text = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new AppError(400, `${fieldName} invalide (format yyyy-mm-dd).`);
  }
  return text;
}

export interface SaisonWizardJoueurInput {
  idJoueur: string;
  poste: number | string;
}

export interface SaisonWizardCompetitionInput {
  competitionId: number | string;
  idem: boolean;
}

export interface SaisonWizardPayload {
  saison: string;
  saDebut: string;
  saFin: string;
  joueurs?: SaisonWizardJoueurInput[];
  competitions?: SaisonWizardCompetitionInput[];
}

export async function createSaisonWithWizard(payload: SaisonWizardPayload): Promise<Record<string, unknown>> {
  const saison = normalizeSaison(payload.saison);
  const saDebut = normalizeIsoDate(payload.saDebut, 'La date de debut');
  const saFin = normalizeIsoDate(payload.saFin, 'La date de fin');

  if (saFin < saDebut) {
    throw new AppError(400, 'La date de fin doit etre posterieure ou egale a la date de debut.');
  }

  const existing = await dbGet<{ SAISON: string }>('SELECT SAISON FROM SAISON WHERE SAISON = ?', [saison]);
  if (existing) {
    throw new AppError(400, 'Cette saison existe deja.');
  }

  const joueurEntries = Array.isArray(payload.joueurs) ? payload.joueurs : [];
  const joueurRows: Array<{ idJoueur: string; poste: number }> = [];
  const seenJoueurs = new Set<string>();
  for (const entry of joueurEntries) {
    const idJoueur = String(entry?.idJoueur ?? '').trim();
    const poste = Number(entry?.poste);
    if (!idJoueur || seenJoueurs.has(idJoueur)) continue;
    if (!Number.isInteger(poste) || poste <= 0) {
      throw new AppError(400, `Poste invalide pour le joueur ${idJoueur}.`);
    }

    const joueurRg = db.prepare('SELECT IDJOUEUR FROM JOUEURRG WHERE IDJOUEUR = ?').get(idJoueur);
    if (!joueurRg) {
      throw new AppError(400, `Joueur ${idJoueur} introuvable.`);
    }
    const posteRow = db.prepare('SELECT POS_ID FROM Poste WHERE POS_ID = ? AND POS_TYPE = 1').get(poste);
    if (!posteRow) {
      throw new AppError(400, `Poste invalide pour le joueur ${idJoueur}.`);
    }

    seenJoueurs.add(idJoueur);
    joueurRows.push({ idJoueur, poste });
  }

  // La saison et son effectif de depart doivent etre crees ensemble: tout ou rien.
  const transaction = db.transaction(() => {
    db.prepare('INSERT INTO SAISON (SAISON, SA_DEBUT, SA_FIN) VALUES (?, ?, ?)').run(saison, saDebut, saFin);

    const insertJoueur = db.prepare(
      `INSERT INTO JOUEUR (
        IDJOUEUR, SAISON, INTERNATIONAL, BUTTOTAL, POSTE, PASSETOTAL,
        JAUNETOTAL, ROUGETOTAL, TITULAIRETOTAL, REMPTOTAL, TEMPSTOTAL
      ) VALUES (?, ?, 0, 0, ?, 0, 0, 0, 0, 0, 0)`,
    );
    for (const row of joueurRows) {
      insertJoueur.run(row.idJoueur, saison, row.poste);
    }
  });
  transaction();

  const competitionEntries = Array.isArray(payload.competitions) ? payload.competitions : [];
  const seenCompetitions = new Set<number>();
  let competitionsCreated = 0;
  for (const entry of competitionEntries) {
    const previousCompetitionId = Number(entry?.competitionId);
    if (!Number.isInteger(previousCompetitionId) || previousCompetitionId <= 0 || seenCompetitions.has(previousCompetitionId)) {
      continue;
    }
    seenCompetitions.add(previousCompetitionId);

    const created = entry?.idem
      ? await clonePreviousCompetition(previousCompetitionId, { saison })
      : await createCompetitionFromPrevious(previousCompetitionId, { saison });
    if (created) {
      competitionsCreated += 1;
    }
  }

  const createdSaison = await dbGet<Record<string, unknown>>(
    'SELECT SAISON, SA_DEBUT, SA_FIN FROM SAISON WHERE SAISON = ?',
    [saison],
  );

  return {
    ...createdSaison,
    joueursCount: joueurRows.length,
    competitionsCount: competitionsCreated,
  };
}

export default {
  ...baseService,
  createSaisonWithWizard,
};
