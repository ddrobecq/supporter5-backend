/** Latin letters that NFD does not decompose into base letter + diacritic (looked up after lowercasing). */
const NON_DECOMPOSABLE_LETTERS: Readonly<Record<string, string>> = {
  \u00df: 'ss', \u00e6: 'ae', \u0153: 'oe', \u00f8: 'o', \u0142: 'l', \u0111: 'd', \u0131: 'i', \u00fe: 'th', \u00f0: 'd',
};

function foldLetters(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\u00df\u00e6\u0153\u00f8\u0142\u0111\u0131\u00fe\u00f0]/g, (letter) => NON_DECOMPOSABLE_LETTERS[letter]);
}

/** Accent- and case-insensitive search key: letters folded to a-z, every other character removed. */
export function normalizeSearchText(value: string): string {
  return foldLetters(value).replace(/[^a-z0-9]/g, '');
}

/** Same folding as normalizeSearchText, but each run of non-alphanumerics becomes a single space (word starts kept). */
export function foldSearchWords(value: string): string {
  return foldLetters(value).replace(/[^a-z0-9]+/g, ' ').trim();
}

/** True when one of `searchCols` contains `search` (already normalized); an empty search matches everything. */
export function rowMatchesSearch(row: Record<string, unknown>, searchCols: readonly string[], search: string): boolean {
  if (!search) {
    return true;
  }

  return searchCols.some((col) => normalizeSearchText(String(row[col] ?? '')).includes(search));
}

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const cols = b.length + 1;
  const rows = a.length + 1;
  const dp = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) dp[i][0] = i;
  for (let j = 0; j < cols; j += 1) dp[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[rows - 1][cols - 1];
}

/**
 * Ranking shared by the suggestion endpoints: score every row, keep scores >= `min`, sort by score
 * (descending) then `tieBreak` (stable sort: remaining ties keep the input order), keep the first `limit`.
 */
export function rankSuggestions<T>(
  rows: readonly T[],
  score: (row: T) => number,
  opts: { min: number; limit: number; tieBreak: (a: T, b: T) => number },
): Array<T & { SCORE: number }> {
  return rows
    .map((row) => ({ ...row, SCORE: score(row) }))
    .filter((row) => row.SCORE >= opts.min)
    .sort((a, b) => b.SCORE - a.SCORE || opts.tieBreak(a, b))
    .slice(0, opts.limit);
}
