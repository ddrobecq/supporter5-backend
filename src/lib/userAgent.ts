/** Coarse User-Agent classification for audience statistics (simple patterns, no external database). */

export type DeviceType = 'desktop' | 'mobile' | 'tablet';
export type BrowserName = 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Opera' | 'Samsung' | 'Autre';
export type OsName = 'Windows' | 'macOS' | 'iOS' | 'Android' | 'Linux' | 'Autre';

export interface ParsedUserAgent {
  device: DeviceType;
  browser: BrowserName;
  os: OsName;
  bot: boolean;
}

const BOT_PATTERN = new RegExp(
  [
    'bot', 'crawl', 'spider', 'slurp', 'headless', 'lighthouse', 'preview', 'facebookexternalhit', 'embedly',
    'pingdom', 'uptime', 'monitor', 'gtmetrix', 'pagespeed', 'validator', 'feedfetcher', 'scrapy', 'phantomjs',
    'selenium', 'puppeteer', 'playwright', 'curl/', 'wget/', 'python-', 'java/', 'go-http-client', 'okhttp',
    'axios/', 'node-fetch', 'httpclient', 'libwww', 'whatsapp', 'vkshare',
  ].join('|'),
  'i',
);

function detectDevice(ua: string): DeviceType {
  if (/ipad|tablet|kindle|silk\/|playbook/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return 'tablet';
  if (/mobi|iphone|ipod|windows phone|blackberry|opera mini/i.test(ua)) return 'mobile';
  return 'desktop';
}

/** Order matters: Edge, Opera and Samsung UAs also contain "Chrome" and "Safari". */
function detectBrowser(ua: string): BrowserName {
  if (/SamsungBrowser\//.test(ua)) return 'Samsung';
  if (/OPR\/|OPT\/|Opera/.test(ua)) return 'Opera';
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'Edge';
  if (/Firefox\/|FxiOS\//.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS\/|Chromium\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari';
  return 'Autre';
}

/** Order matters: iOS UAs contain "like Mac OS X", Android UAs contain "Linux". */
function detectOs(ua: string): OsName {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
  if (/Linux|CrOS|X11/.test(ua)) return 'Linux';
  return 'Autre';
}

export function parseUserAgent(userAgent: string): ParsedUserAgent {
  const ua = userAgent.trim();
  return {
    device: detectDevice(ua),
    browser: detectBrowser(ua),
    os: detectOs(ua),
    bot: ua === '' || BOT_PATTERN.test(ua),
  };
}
