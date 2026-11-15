import { AppError } from '../types';
import { toText } from './coerce';

/** Regle metier partagee: une saison doit etre au format "xxxx-yyyy" (ex: "2024-2025"). */
export function normalizeSaison(value: unknown, message = 'Saison invalide (format xxxx-yyyy).'): string {
  const saison = toText(value);
  if (!/^\d{4}-\d{4}$/.test(saison)) {
    throw new AppError(400, message);
  }
  return saison;
}
