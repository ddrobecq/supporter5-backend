import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net, { type LookupFunction } from 'node:net';

/** Maximum number of redirects followed by an outbound request. */
const MAX_REDIRECTS = 3;

/** Destinations an outbound request must never reach (SSRF protection). */
const BLOCKED_ADDRESSES = new net.BlockList();
BLOCKED_ADDRESSES.addSubnet('0.0.0.0', 8, 'ipv4');
BLOCKED_ADDRESSES.addSubnet('10.0.0.0', 8, 'ipv4');
BLOCKED_ADDRESSES.addSubnet('127.0.0.0', 8, 'ipv4');
BLOCKED_ADDRESSES.addSubnet('169.254.0.0', 16, 'ipv4');
BLOCKED_ADDRESSES.addSubnet('172.16.0.0', 12, 'ipv4');
BLOCKED_ADDRESSES.addSubnet('192.168.0.0', 16, 'ipv4');
BLOCKED_ADDRESSES.addAddress('::', 'ipv6');
BLOCKED_ADDRESSES.addAddress('::1', 'ipv6');
BLOCKED_ADDRESSES.addSubnet('fe80::', 10, 'ipv6');
BLOCKED_ADDRESSES.addSubnet('fc00::', 7, 'ipv6');

export class OutboundRequestError extends Error {}

export interface SafeFetchOptions {
  accept: string;
  maxBytes: number;
  timeoutMs: number;
  /** Optional check of the Content-Type header, done before the body is downloaded. */
  isAcceptedContentType?: (contentType: string) => boolean;
}

export interface SafeFetchResponse {
  contentType: string;
  body: Buffer;
}

/**
 * True for non-IP values and for blocked addresses. IPv4-mapped IPv6 addresses
 * (::ffff:a.b.c.d) are matched against the IPv4 rules by net.BlockList.
 */
export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 0) {
    return true;
  }
  return BLOCKED_ADDRESSES.check(address, family === 6 ? 'ipv6' : 'ipv4');
}

/** True when `value` is an absolute http: or https: URL. */
export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function assertPublicHttpUrl(url: URL): URL {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new OutboundRequestError(`Unsupported protocol: ${url.protocol}`);
  }
  // IP literals skip the DNS lookup below, so they are checked here.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) !== 0 && isBlockedAddress(host)) {
    throw new OutboundRequestError(`Blocked destination: ${host}`);
  }
  return url;
}

/**
 * DNS lookup used by the socket itself: every resolved address is validated at connection
 * time, so a host cannot resolve to a public IP during a check and to a private one afterwards.
 */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dns.promises
    .lookup(hostname, { ...options, all: true })
    .then((addresses) => {
      const blocked = addresses.find((entry) => isBlockedAddress(entry.address));
      if (addresses.length === 0 || blocked) {
        callback(new OutboundRequestError(`Blocked destination for ${hostname}: ${blocked?.address ?? 'no address'}`), '', 0);
        return;
      }
      if (options.all) {
        callback(null, addresses);
        return;
      }
      callback(null, addresses[0].address, addresses[0].family);
    })
    .catch((error: NodeJS.ErrnoException) => callback(error, '', 0));
};

function openRequest(url: URL, accept: string, signal: AbortSignal): Promise<http.IncomingMessage> {
  const client = url.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const request = client.get(
      url,
      // Same User-Agent as the fetch() implementation this replaces, so feeds keep answering.
      { headers: { Accept: accept, 'User-Agent': 'node' }, lookup: guardedLookup, signal },
      resolve,
    );
    request.on('error', reject);
  });
}

/** Reads the body as a stream and aborts as soon as it exceeds `maxBytes`. */
function readLimitedBody(response: http.IncomingMessage, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    response.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        response.destroy(new OutboundRequestError(`Response body exceeds ${maxBytes} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    response.on('end', () => resolve(Buffer.concat(chunks)));
    response.on('error', reject);
    response.on('close', () => {
      if (!response.complete) {
        reject(new OutboundRequestError('Response aborted before completion'));
      }
    });
  });
}

/**
 * GET restricted to public http(s) destinations: blocked IP ranges are refused (including after
 * DNS resolution), redirects are followed manually (at most MAX_REDIRECTS, each target revalidated)
 * and the body is capped at `maxBytes`. Rejects on any non-2xx final status.
 */
export async function safeFetch(rawUrl: string, options: SafeFetchOptions): Promise<SafeFetchResponse> {
  const signal = AbortSignal.timeout(options.timeoutMs);
  let url = assertPublicHttpUrl(new URL(rawUrl));

  for (let redirects = 0; ; redirects += 1) {
    const response = await openRequest(url, options.accept, signal);
    const status = response.statusCode ?? 0;
    const location = response.headers.location;

    if (status >= 300 && status < 400 && location) {
      response.destroy();
      if (redirects >= MAX_REDIRECTS) {
        throw new OutboundRequestError(`More than ${MAX_REDIRECTS} redirects`);
      }
      url = assertPublicHttpUrl(new URL(location, url));
      continue;
    }

    const contentType = String(response.headers['content-type'] ?? '').toLowerCase();
    const contentLength = Number(response.headers['content-length'] ?? 0);
    if (status < 200 || status >= 300) {
      response.destroy();
      throw new OutboundRequestError(`HTTP ${status}`);
    }
    if (options.isAcceptedContentType && !options.isAcceptedContentType(contentType)) {
      response.destroy();
      throw new OutboundRequestError(`Unexpected content type: ${contentType || 'none'}`);
    }
    if (contentLength > options.maxBytes) {
      response.destroy();
      throw new OutboundRequestError(`Response body exceeds ${options.maxBytes} bytes`);
    }

    return { contentType, body: await readLimitedBody(response, options.maxBytes) };
  }
}
