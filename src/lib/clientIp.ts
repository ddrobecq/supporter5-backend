import net from 'node:net';
import type { Request } from 'express';

/** `value` as a valid IP address (IPv4-mapped IPv6 reduced to IPv4), or '' when it is not one. */
function validIp(value: string): string {
  const address = value.trim();
  if (address.toLowerCase().startsWith('::ffff:') && net.isIPv4(address.slice(7))) return address.slice(7);
  return net.isIP(address) ? address : '';
}

/**
 * Visitor address for AUDIENCE TRACKING ONLY (fallback visitor hash + country lookup), never for security
 * (rate limiting, access control...): on Render behind Cloudflare, req.ip is an internal relay address.
 * Order: CF-Connecting-IP (set by Cloudflare), then the first valid X-Forwarded-For entry (the real client
 * according to Render, which appends without cleaning), then req.ip.
 * Both headers can be forged by the client; the impact is limited to the forger's own hits (country, hash).
 */
export function trackingClientIp(req: Request): string {
  const cf = validIp(req.get('cf-connecting-ip') ?? '');
  if (cf) return cf;
  for (const entry of (req.get('x-forwarded-for') ?? '').split(',')) {
    const ip = validIp(entry);
    if (ip) return ip;
  }
  return validIp(req.ip ?? '');
}
