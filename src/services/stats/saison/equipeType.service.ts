import { dbAll } from '../../../config/database';

/** Postes de champ (hors remplacants), du gardien vers l'attaque. */
export const PITCH_SLOTS = [
  'GOAL',
  'DLG', 'DLD', 'DCG', 'DCD', 'LIB', 'STO',
  'MDLD', 'MDLG', 'MDCD', 'MDCG', 'MDCC',
  'MOLD', 'MOLG', 'MOCD', 'MOCG', 'MOCC',
  'ALD', 'ALG', 'ACD', 'ACG', 'AVC',
] as const;

type SlotCode = typeof PITCH_SLOTS[number];

/** Lignes utilisees pour deduire le libelle de formation (ex: 3-4-2-1). */
const FORMATION_LINES: SlotCode[][] = [
  ['DLG', 'DLD', 'DCG', 'DCD', 'LIB', 'STO'],
  ['MDLD', 'MDLG', 'MDCD', 'MDCG', 'MDCC'],
  ['MOLD', 'MOLG', 'MOCD', 'MOCG', 'MOCC'],
  ['ALD', 'ALG', 'ACD', 'ACG', 'AVC'],
];

export interface EquipeTypeJoueur {
  CODE: string;
  IDJOUEUR: string;
  NOM: string;
  PRENOM: string;
  SURNOM: string | null;
  IDNATIO: string | null;
  TITULARISATIONS: number;
}

export interface EquipeTypeResult {
  SAISON: string;
  MATCHES_TOTAL: number;
  MATCHES_FORMATION: number;
  FORMATION: string;
  POSTES: EquipeTypeJoueur[];
  ENTRAINEUR: EquipeTypeJoueur | null;
}

type CompoRow = Record<string, string | null> & { DATE: string };

export function normalize(value: unknown): string {
  return String(value ?? '').trim();
}

export function formationLabel(codes: string[]): string {
  const occupied = new Set(codes);
  return FORMATION_LINES
    .map((line) => line.filter((code) => occupied.has(code)).length)
    .filter((count) => count > 0)
    .join('-');
}

/** Meilleur candidat par cle, departage par occurrences puis par date la plus recente. */
function rank<T>(entries: Map<T, { count: number; last: string }>): { value: T; count: number; last: string }[] {
  return [...entries.entries()]
    .map(([value, stat]) => ({ value, ...stat }))
    .sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));
}

function tally(rows: CompoRow[], pick: (row: CompoRow) => string): Map<string, { count: number; last: string }> {
  const counts = new Map<string, { count: number; last: string }>();
  for (const row of rows) {
    const key = pick(row);
    if (!key) continue;
    const current = counts.get(key);
    const date = normalize(row.DATE);
    if (current) {
      current.count += 1;
      if (date > current.last) current.last = date;
    } else {
      counts.set(key, { count: 1, last: date });
    }
  }
  return counts;
}

/**
 * Composition type d'une saison (ou historique toutes saisons confondues si `saison` omis):
 * formation la plus frequente, puis joueur le plus frequent a chaque poste de cette formation
 * (appariement glouton pour eviter qu'un joueur occupe 2 postes).
 */
export async function getEquipeType(saison?: string | null): Promise<EquipeTypeResult> {
  const rows = await dbAll<CompoRow>(
    `SELECT e.*
     FROM EQUIPE e
     INNER JOIN MATCH m ON m.MACLEUNIK = e.MACLEUNIK
     INNER JOIN RENCO r ON r.RECLEUNIK = m.RECLEUNIK
     WHERE COALESCE(r.TUCLEUNIK, 0) <> 0
       ${saison ? 'AND e.SAISON = ?' : ''}`,
    saison ? [saison] : [],
  );

  const empty: EquipeTypeResult = {
    SAISON: saison ?? '',
    MATCHES_TOTAL: rows.length,
    MATCHES_FORMATION: 0,
    FORMATION: '',
    POSTES: [],
    ENTRAINEUR: null,
  };
  if (rows.length === 0) return empty;

  // Etape 1: signature = ensemble des postes occupes; on retient la plus frequente.
  const bySignature = new Map<string, CompoRow[]>();
  for (const row of rows) {
    const signature = PITCH_SLOTS.filter((code) => normalize(row[code])).join('|');
    if (!signature) continue;
    const bucket = bySignature.get(signature);
    if (bucket) bucket.push(row);
    else bySignature.set(signature, [row]);
  }
  if (bySignature.size === 0) return empty;

  const [topSignature] = [...bySignature.entries()].sort(
    (a, b) => b[1].length - a[1].length
      || normalize(b[1][b[1].length - 1].DATE).localeCompare(normalize(a[1][a[1].length - 1].DATE)),
  );
  const [signature, formationRows] = topSignature;
  const codes = signature.split('|');

  // Etape 2 + 3: candidats par poste sur les seuls matchs de cette formation, puis appariement glouton.
  const candidates = codes.flatMap((code) =>
    rank(tally(formationRows, (row) => normalize(row[code])))
      .map((entry) => ({ code, idjoueur: entry.value, count: entry.count, last: entry.last })));
  candidates.sort((a, b) => b.count - a.count || b.last.localeCompare(a.last));

  const assigned = new Map<string, { idjoueur: string; count: number }>();
  const usedPlayers = new Set<string>();
  for (const candidate of candidates) {
    if (assigned.has(candidate.code) || usedPlayers.has(candidate.idjoueur)) continue;
    assigned.set(candidate.code, { idjoueur: candidate.idjoueur, count: candidate.count });
    usedPlayers.add(candidate.idjoueur);
  }

  // Etape 4: entraineur le plus frequent sur l'ensemble de la saison.
  const coachRanking = rank(tally(rows, (row) => normalize(row.ENTRAINEUR)));
  const topCoach = coachRanking[0] ?? null;

  const playerIds = [...usedPlayers, ...(topCoach ? [topCoach.value] : [])];
  const identities = playerIds.length === 0 ? [] : await dbAll<{
    IDJOUEUR: string; NOM: string; PRENOM: string; SURNOM: string | null; IDNATIO: string | null;
  }>(
    `SELECT IDJOUEUR, NOM, PRENOM, SURNOM, IDNATIO
     FROM JOUEURRG
     WHERE IDJOUEUR IN (${playerIds.map(() => '?').join(', ')})`,
    playerIds,
  );
  const identityById = new Map(identities.map((row) => [row.IDJOUEUR, row]));

  const toJoueur = (code: string, idjoueur: string, count: number): EquipeTypeJoueur => {
    const identity = identityById.get(idjoueur);
    return {
      CODE: code,
      IDJOUEUR: idjoueur,
      NOM: identity?.NOM ?? '',
      PRENOM: identity?.PRENOM ?? '',
      SURNOM: identity?.SURNOM ?? null,
      IDNATIO: identity?.IDNATIO ?? null,
      TITULARISATIONS: count,
    };
  };

  return {
    SAISON: saison ?? '',
    MATCHES_TOTAL: rows.length,
    MATCHES_FORMATION: formationRows.length,
    FORMATION: formationLabel(codes),
    POSTES: codes
      .filter((code) => assigned.has(code))
      .map((code) => toJoueur(code, assigned.get(code)!.idjoueur, assigned.get(code)!.count)),
    ENTRAINEUR: topCoach ? toJoueur('ENTRAINEUR', topCoach.value, topCoach.count) : null,
  };
}
