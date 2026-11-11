import { toText } from './coerce';

export function getSupportedClubIdFromEnv(): string {
  const configured = toText(process.env.SUPPORTED_CLUB);
  return configured || '0001';
}
