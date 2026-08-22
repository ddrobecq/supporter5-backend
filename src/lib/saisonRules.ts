import { AppError } from '../types';

/** Regle metier partagee: une saison doit etre au format "xxxx-yyyy" (ex: "2024-2025"). */
export function normalizeSaison(value: unknown): string {
  const saison = String(value ?? '').trim();
  if (!/^\d{4}-\d{4}$/.test(saison)) {
    throw new AppError(400, 'Saison invalide (format xxxx-yyyy).');
  }
  return saison;
}
