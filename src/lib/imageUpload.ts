import { IMAGE_CONFIGS } from './imageConfig';
import { sanitizeSvg } from './svgSanitizer';
import { UPLOAD_LIMITS, formatBytes } from '../config/uploadLimits';
import { AppError } from '../types';

const UNSUPPORTED_FORMAT_MESSAGE = 'Format d\'image non supporté (PNG, JPEG, GIF, WebP ou SVG attendus).';
const BASE64_PATTERN = /^[A-Za-z0-9+/=\s]+$/;

type RasterMimeType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';

/** Detects a whitelisted raster format from its magic bytes, regardless of any declared type. */
function detectRasterType(buf: Buffer): RasterMimeType | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buf.length >= 6) {
    const head = buf.subarray(0, 6).toString('latin1');
    if (head === 'GIF87a' || head === 'GIF89a') return 'image/gif';
  }
  if (buf.length >= 12
    && buf.subarray(0, 4).toString('latin1') === 'RIFF'
    && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

function decodeBase64(payload: string): Buffer {
  if (!BASE64_PATTERN.test(payload)) {
    throw new AppError(400, 'Image invalide : encodage base64 incorrect.');
  }
  return Buffer.from(payload, 'base64');
}

/** Decodes the incoming value (data URL, SVG markup or bare base64) into raw bytes. */
function decodeImageInput(text: string): Buffer {
  if (text.startsWith('data:')) {
    const commaIdx = text.indexOf(',');
    if (commaIdx === -1) {
      throw new AppError(400, 'Image invalide : data URL mal formée.');
    }
    const metadata = text.slice(5, commaIdx).toLowerCase();
    const payload = text.slice(commaIdx + 1);
    if (metadata.split(';').includes('base64')) {
      return decodeBase64(payload);
    }
    try {
      return Buffer.from(decodeURIComponent(payload), 'utf8');
    } catch {
      throw new AppError(400, 'Image invalide : data URL mal encodée.');
    }
  }

  if (text.replace(/^﻿/, '').startsWith('<')) {
    return Buffer.from(text, 'utf8');
  }

  return decodeBase64(text);
}

function assertMaxSize(size: number, max: number, label: string): void {
  if (size > max) {
    throw new AppError(413, `Image trop volumineuse (${formatBytes(size)}). Taille maximale pour ${label} : ${formatBytes(max)}.`);
  }
}

/**
 * Validates and normalizes an image received from the API before it is stored.
 * - null / empty string -> null (image removed).
 * - Raster (PNG, JPEG, GIF, WebP, detected by magic bytes): stored as-is, max 2 Mo decoded.
 * - SVG: max 500 Ko decoded, then sanitized by whitelist.
 * - Buffers are internal values (copied from the database, never produced by JSON): kept as-is.
 * @throws AppError 400 (invalid or unsupported format) or 413 (too large).
 */
export function prepareImageForStorage(value: unknown): Buffer | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  if (typeof value !== 'string') {
    throw new AppError(400, UNSUPPORTED_FORMAT_MESSAGE);
  }

  const text = value.trim();
  if (!text) {
    return null;
  }

  const buffer = decodeImageInput(text);
  if (!buffer.length) {
    throw new AppError(400, 'Image invalide : contenu vide.');
  }

  if (detectRasterType(buffer)) {
    assertMaxSize(buffer.length, UPLOAD_LIMITS.rasterImageBytes, 'une image PNG, JPEG, GIF ou WebP');
    return buffer;
  }

  const markup = buffer.toString('utf8').replace(/^﻿/, '').trimStart();
  if (!markup.startsWith('<')) {
    throw new AppError(400, UNSUPPORTED_FORMAT_MESSAGE);
  }
  assertMaxSize(buffer.length, UPLOAD_LIMITS.svgImageBytes, 'une image SVG');
  return Buffer.from(sanitizeSvg(markup), 'utf8');
}

/**
 * Applies prepareImageForStorage() to the image columns of `table` (see IMAGE_CONFIGS)
 * present in a write payload. Other fields are returned unchanged.
 */
export function sanitizeImageFields(table: string, body: Record<string, unknown>): Record<string, unknown> {
  const foldedTable = table.toUpperCase();
  for (const config of Object.values(IMAGE_CONFIGS)) {
    if (config.table.toUpperCase() !== foldedTable) continue;
    for (const key of Object.keys(body)) {
      if (key.toUpperCase() === config.field.toUpperCase()) {
        body[key] = prepareImageForStorage(body[key]);
      }
    }
  }
  return body;
}
