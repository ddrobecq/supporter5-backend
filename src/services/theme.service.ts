import { dbAll, dbRun } from '../config/database';
import { AppError } from '../types';

export interface ThemeRow {
  CODE: 'HOME' | 'AWAY' | 'THIRD';
  LABEL: string;
  BACKGROUND_COLOR: string;
  TEXT_COLOR: string;
  UPDATED_AT: string;
}

const THEME_CODES = new Set(['HOME', 'AWAY', 'THIRD']);
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export async function listThemes(): Promise<ThemeRow[]> {
  return dbAll<ThemeRow>('SELECT CODE, LABEL, BACKGROUND_COLOR, TEXT_COLOR, UPDATED_AT FROM APP_THEME ORDER BY CASE CODE WHEN \'HOME\' THEN 1 WHEN \'AWAY\' THEN 2 ELSE 3 END');
}

export async function updateTheme(code: string, backgroundColor: string, textColor: string): Promise<ThemeRow> {
  const normalizedCode = code.toUpperCase();
  if (!THEME_CODES.has(normalizedCode) || !COLOR_PATTERN.test(backgroundColor) || !COLOR_PATTERN.test(textColor)) {
    throw new AppError(400, 'Code de theme ou couleur invalide.');
  }
  await dbRun('UPDATE APP_THEME SET BACKGROUND_COLOR = ?, TEXT_COLOR = ?, UPDATED_AT = CURRENT_TIMESTAMP WHERE CODE = ?', [backgroundColor.toUpperCase(), textColor.toUpperCase(), normalizedCode]);
  const themes = await listThemes();
  const updated = themes.find((theme) => theme.CODE === normalizedCode);
  if (!updated) throw new AppError(404, 'Theme introuvable.');
  return updated;
}