import { dbGet } from '../config/database';
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
  const head = buf.slice(0, 256).toString('utf8').trimStart().toLowerCase();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'image/svg+xml';
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

    // MySQL/turso textual hex wrappers: x'ABCD...' or 0xABCD...
    const xQuotedHex = /^x'([0-9a-fA-F]+)'$/i.exec(trimmed);
    if (xQuotedHex && xQuotedHex[1].length % 2 === 0) {
      return Buffer.from(xQuotedHex[1], 'hex');
    }
    if (/^0x[0-9a-fA-F]+$/i.test(trimmed) && (trimmed.length - 2) % 2 === 0) {
      return Buffer.from(trimmed.slice(2), 'hex');
    }

    // Data URL base64
    if (trimmed.startsWith('data:')) {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx === -1) return null;
      const payload = trimmed.slice(commaIdx + 1);
      return Buffer.from(payload, 'base64');
    }

    // String hexadécimale pure, éventuellement avec espaces/retours ligne.
    const compactHex = trimmed.replace(/[\s\r\n\t]+/g, '');
    if (/^[0-9a-fA-F]+$/.test(compactHex) && compactHex.length % 2 === 0) {
      return Buffer.from(compactHex, 'hex');
    }

    // Fallback : base64 pur
    try {
      return Buffer.from(trimmed, 'base64');
    } catch {
      return null;
    }
  }

  return null;
}

/** Retourne l'image d'une entité ou null si absente. */
export async function getEntityImage(
  entityType: string,
  id: string,
): Promise<ImageResult | null> {
  const config: ImageConfig | undefined = IMAGE_CONFIGS[entityType.toLowerCase()];
  if (!config) {
    console.error(`[IMAGE] Unknown entity type: ${entityType}`);
    return null;
  }

  console.log(`[IMAGE] Fetching ${entityType}#${id} from ${config.table}.${config.field}`);

  const row = await dbGet<Record<string, unknown>>(
    `SELECT ${config.field} FROM ${config.table} WHERE ${config.pk} = ?`,
    [id],
  );

  if (!row) {
    console.warn(`[IMAGE] No row found for ${entityType}#${id}`);
    return null;
  }

  const raw = row[config.field];
  console.log(`[IMAGE] Raw data from DB - Type: ${typeof raw}, Length: ${String(raw).length}`);
  console.log(`[IMAGE] Raw data details:`, JSON.stringify(raw, null, 2).slice(0, 200));
  
  const buffer = toBuffer(raw);
  if (!buffer || buffer.length === 0) {
    console.warn(`[IMAGE] Buffer conversion failed or empty for ${entityType}#${id}`);
    return null;
  }

  const mimeType = detectMimeType(buffer);
  console.log(`[IMAGE] ✓ Image ready - Size: ${buffer.length} bytes, MIME: ${mimeType}, First bytes: ${buffer.slice(0, 20).toString('hex')}`);

  return {
    buffer,
    mimeType,
  };
}
