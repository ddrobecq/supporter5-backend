import db, { dbGet, runInTransaction } from '../config/database';
import { createEntityService } from '../lib/baseService';
import { normalizeSaison } from '../lib/saisonRules';
import { normalizeDayDate } from '../lib/dates';
import { clonePreviousCompetition, createCompetitionFromPrevious } from './competition.service';
import { parseFlag, requireBodyObject, requirePositiveInt, requireText } from '../lib/coerce';
import { AppError } from '../types';

const baseService = createEntityService({
  table:           'SAISON',
  pk:              'SAISON',
  selectCols:      ['SAISON', 'SA_DEBUT', 'SA_FIN'],
  allowedSortCols: ['SAISON', 'SA_DEBUT', 'SA_FIN'],
  searchCols:      ['SAISON'],
  filterCols:      [],
});

export interface SaisonWizardJoueurInput {
  idJoueur: string;
  poste: number;
}

export interface SaisonWizardCompetitionInput {
  competitionId: number;
  idem: boolean;
}

export interface SaisonWizardPayload {
  saison: string;
  saDebut: string;
  saFin: string;
  /** Each idJoueur at most once. */
  joueurs: SaisonWizardJoueurInput[];
  /** Each competitionId at most once. */
  competitions: SaisonWizardCompetitionInput[];
}

/** Optional list of the body: absent / null = empty, anything else than an array is a 400. */
function parseEntryList(value: unknown, field: string): Record<string, unknown>[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new AppError(400, `${field} invalide (tableau attendu).`);
  return value.map((entry: unknown, index) => requireBodyObject(entry, `${field}[${index}] invalide (objet attendu).`));
}

/**
 * Wizard body: every entry is either taken as sent or rejected (400), never skipped.
 * A player or a competition sent twice is a 400 (the back does not choose between the two entries).
 */
export function parseSaisonWizardPayload(body: unknown): SaisonWizardPayload {
  const raw = requireBodyObject(body);
  const saison = normalizeSaison(raw.saison);
  const saDebut = normalizeDayDate(raw.saDebut, { required: true, field: 'de debut' });
  const saFin = normalizeDayDate(raw.saFin, { required: true, field: 'de fin' });

  const joueurs: SaisonWizardJoueurInput[] = [];
  const seenJoueurs = new Set<string>();
  parseEntryList(raw.joueurs, 'joueurs').forEach((entry, index) => {
    const idJoueur = requireText(entry.idJoueur, `joueurs[${index}] : idJoueur requis.`);
    if (seenJoueurs.has(idJoueur)) throw new AppError(400, `Joueur ${idJoueur} envoyé deux fois.`);
    const poste = requirePositiveInt(entry.poste, `Poste invalide pour le joueur ${idJoueur}.`);
    seenJoueurs.add(idJoueur);
    joueurs.push({ idJoueur, poste });
  });

  const competitions: SaisonWizardCompetitionInput[] = [];
  const seenCompetitions = new Set<number>();
  parseEntryList(raw.competitions, 'competitions').forEach((entry, index) => {
    const competitionId = requirePositiveInt(entry.competitionId, `competitions[${index}] : competitionId invalide (entier positif attendu).`);
    if (seenCompetitions.has(competitionId)) throw new AppError(400, `Compétition ${competitionId} envoyée deux fois.`);
    const idem = entry.idem === undefined ? false : parseFlag(entry.idem, 'idem') === 1;
    seenCompetitions.add(competitionId);
    competitions.push({ competitionId, idem });
  });

  return { saison, saDebut, saFin, joueurs, competitions };
}

export async function createSaisonWithWizard(payload: SaisonWizardPayload): Promise<Record<string, unknown>> {
  const { saison, saDebut, saFin } = payload;

  if (saFin < saDebut) {
    throw new AppError(422, 'La date de fin doit etre posterieure ou egale a la date de debut.');
  }

  const existing = await dbGet<{ SAISON: string }>('SELECT SAISON FROM SAISON WHERE SAISON = ?', [saison]);
  if (existing) {
    throw new AppError(422, 'Cette saison existe deja.');
  }

  const findJoueurRg = db.prepare('SELECT IDJOUEUR FROM JOUEURRG WHERE IDJOUEUR = ?');
  const findPlayerPoste = db.prepare('SELECT POS_ID FROM Poste WHERE POS_ID = ? AND POS_TYPE = 1');
  for (const { idJoueur, poste } of payload.joueurs) {
    const joueurRg = findJoueurRg.get(idJoueur);
    if (!joueurRg) {
      throw new AppError(422, `Joueur ${idJoueur} introuvable.`);
    }
    const posteRow = findPlayerPoste.get(poste);
    if (!posteRow) {
      throw new AppError(422, `Poste invalide pour le joueur ${idJoueur}.`);
    }
  }

  // La saison, son effectif de depart et ses competitions sont crees ensemble: tout ou rien
  // (clonePreviousCompetition et son db.transaction deviennent un savepoint de cette transaction).
  const competitionsCreated = await runInTransaction(async () => {
    db.prepare('INSERT INTO SAISON (SAISON, SA_DEBUT, SA_FIN) VALUES (?, ?, ?)').run(saison, saDebut, saFin);

    const insertJoueur = db.prepare(
      `INSERT INTO JOUEUR (
        IDJOUEUR, SAISON, INTERNATIONAL, BUTTOTAL, POSTE, PASSETOTAL,
        JAUNETOTAL, ROUGETOTAL, TITULAIRETOTAL, REMPTOTAL, TEMPSTOTAL
      ) VALUES (?, ?, 0, 0, ?, 0, 0, 0, 0, 0, 0)`,
    );
    for (const row of payload.joueurs) {
      insertJoueur.run(row.idJoueur, saison, row.poste);
    }

    let createdCount = 0;
    for (const { competitionId, idem } of payload.competitions) {
      const created = idem
        ? await clonePreviousCompetition(competitionId, { saison })
        : await createCompetitionFromPrevious(competitionId, { saison });
      if (created) {
        createdCount += 1;
      }
    }
    return createdCount;
  });

  const createdSaison = await dbGet<Record<string, unknown>>(
    'SELECT SAISON, SA_DEBUT, SA_FIN FROM SAISON WHERE SAISON = ?',
    [saison],
  );

  return {
    ...createdSaison,
    joueursCount: payload.joueurs.length,
    competitionsCount: competitionsCreated,
  };
}

export default {
  ...baseService,
  createSaisonWithWizard,
};
