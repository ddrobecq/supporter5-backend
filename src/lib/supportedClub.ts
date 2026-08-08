function toText(value: unknown): string {
  return String(value ?? '').trim();
}

export function getSupportedClubIdFromEnv(): string {
  const configured = toText(process.env.SUPPORTED_CLUB);
  return configured || '0001';
}
