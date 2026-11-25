import net from 'node:net';
import type { Request } from 'express';

/** `value` as a valid IP address (IPv4-mapped IPv6 reduced to IPv4), or '' when it is not one. */
function validIp(value: string): string {
  const address = value.trim();
  if (address.toLowerCase().startsWith('::ffff:') && net.isIPv4(address.slice(7))) return address.slice(7);
  return net.isIP(address) ? address : '';
}

/**
 * Visitor address for audience tracking (fallback visitor hash + country lookup): req.ip, normalized.
 * With `trust proxy` set to the Cloudflare -> Render chain (see app.ts), req.ip is the real client and
 * cannot be forged; the raw CF-Connecting-IP / X-Forwarded-For headers are deliberately not read.
 */
export function trackingClientIp(req: Request): string {
  return validIp(req.ip ?? '');
}
