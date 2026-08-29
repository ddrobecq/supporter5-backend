import { dbGet, dbRun } from '../config/database';
import { IMAGE_CONFIGS, type ImageConfig } from './imageConfig';

export interface ImageResult {
  buffer: Buffer;
  mimeType: string;
}

/** Détecte le type MIME à partir des magic bytes du buffer. */
function detectMimeType(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d) return 'image/bmp';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 4 &&
    buf[0] === 0x89 && buf[1] === 0x50 &&
    buf[2] === 0x4e && buf[3] === 0x47
  ) return 'image/png';
  if (buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  const head = buf
    .slice(0, 512)
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trimStart()
    .toLowerCase();
  if (head.startsWith('<svg') || head.startsWith('<?xml') || head.includes('<svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

/** Convertit la valeur brute retournée par Turso en Buffer. */
function toBuffer(raw: unknown): Buffer | null {
  if (raw === null || raw === undefined || raw === '') return null;

  // Uint8Array / Buffer natif (BLOB Turso)
  if (raw instanceof Uint8Array) return Buffer.from(raw);
  if (Buffer.isBuffer(raw)) return raw;

  // ArrayBuffer (peut être retourné par le client Turso)
  if (raw instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(raw));
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // SVG/XML en texte brut
    const normalizedText = trimmed.replace(/^\uFEFF/, '');
    if (normalizedText.startsWith('<svg') || normalizedText.startsWith('<?xml')) {
      return Buffer.from(normalizedText, 'utf8');
    }

    // MySQL/turso textual hex wrappers: x'ABCD...' or 0xABCD...
    const xQuotedHex = /^x'([0-9a-fA-F]+)'$/i.exec(trimmed);
    if (xQuotedHex && xQuotedHex[1].length % 2 === 0) {
      return Buffer.from(xQuotedHex[1], 'hex');
    }
    if (/^0x[0-9a-fA-F]+$/i.test(trimmed) && (trimmed.length - 2) % 2 === 0) {
      return Buffer.from(trimmed.slice(2), 'hex');
    }

    // Data URL (base64 ou URL-encoded)
    if (trimmed.startsWith('data:')) {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx === -1) return null;

      const metadata = trimmed.slice(5, commaIdx).toLowerCase();
      const payload = trimmed.slice(commaIdx + 1);

      if (metadata.includes('svg')) {
        const decoded = metadata.includes(';base64')
          ? Buffer.from(payload, 'base64').toString('utf8')
          : decodeURIComponent(payload);
        return Buffer.from(decoded, 'utf8');
      }

      if (metadata.includes(';base64')) {
        return Buffer.from(payload, 'base64');
      }

      return Buffer.from(decodeURIComponent(payload), 'utf8');
    }

    // String hexadécimale pure, éventuellement avec espaces/retours ligne.
    const compactHex = trimmed.replace(/[\s\r\n\t]+/g, '');
    if (/^[0-9a-fA-F]+$/.test(compactHex) && compactHex.length % 2 === 0) {
      return Buffer.from(compactHex, 'hex');
    }

    // Base64 pur
    if (/^[A-Za-z0-9+/=\r\n\t\s]+$/.test(trimmed)) {
      try {
        return Buffer.from(trimmed, 'base64');
      } catch {
        return null;
      }
    }

    return Buffer.from(trimmed, 'utf8');
  }

  return null;
}

function normalizeImageInput(value: unknown): Buffer | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return toBuffer(value);
}

/** Retourne l'image d'une entité ou null si absente. */
export async function getEntityImage(
  entityType: string,
  id: string,
): Promise<ImageResult | null> {
  const config: ImageConfig | undefined = IMAGE_CONFIGS[entityType.toLowerCase()];
  if (!config) {
    return null;
  }

  const row = await dbGet<Record<string, unknown>>(
    `SELECT ${config.field} FROM ${config.table} WHERE ${config.pk} = ?`,
    [id],
  );

  if (!row) {
    return null;
  }

  const raw = row[config.field];

  const buffer = toBuffer(raw);
  if (!buffer || buffer.length === 0) {
    return null;
  }

  const mimeType = detectMimeType(buffer);

  return {
    buffer,
    mimeType,
  };
}

export async function setEntityImage(
  entityType: string,
  id: string,
  imageValue: unknown,
): Promise<boolean> {
  const config: ImageConfig | undefined = IMAGE_CONFIGS[entityType.toLowerCase()];
  if (!config) {
    return false;
  }

  const exists = await dbGet<Record<string, unknown>>(
    `SELECT ${config.pk} FROM ${config.table} WHERE ${config.pk} = ?`,
    [id],
  );
  if (!exists) {
    return false;
  }

  const buffer = normalizeImageInput(imageValue);

  await dbRun(
    `UPDATE ${config.table} SET ${config.field} = ? WHERE ${config.pk} = ?`,
    [buffer, id],
  );

  return true;
}
