/** Upload size limits (bytes), validated by the product owner. */
const KB = 1024;
const MB = 1024 * KB;

export const UPLOAD_LIMITS = {
  /** PNG, JPEG, GIF, WebP: decoded size. */
  rasterImageBytes: 2 * MB,
  /** SVG: decoded size, before sanitizing. */
  svgImageBytes: 500 * KB,
  /** CSV file selected for the match import (parsed by the front, sent as JSON rows). */
  csvImportBytes: 5 * MB,
  /** SQLite database file uploaded from the admin system page. */
  sqliteDatabaseBytes: 1024 * MB,
} as const;

/** Default JSON body limit for every route without a dedicated limit. */
export const DEFAULT_JSON_BODY_LIMIT_BYTES = 1 * MB;

/**
 * JSON body limit for routes carrying one image as a data URL:
 * base64 adds ~33 %, plus the data URL prefix and the JSON envelope -> raster limit x 1.4.
 */
export const IMAGE_JSON_BODY_LIMIT_BYTES = Math.ceil(UPLOAD_LIMITS.rasterImageBytes * 1.4);

/**
 * JSON body limit for the match import: the CSV is sent as an array of objects whose keys are
 * repeated on every row, which roughly triples the size of the original file.
 */
export const CSV_IMPORT_JSON_BODY_LIMIT_BYTES = UPLOAD_LIMITS.csvImportBytes * 3;

export function formatBytes(bytes: number): string {
  return bytes >= MB ? `${Math.round((bytes / MB) * 10) / 10} Mo` : `${Math.round(bytes / KB)} Ko`;
}
