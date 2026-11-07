import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import { AppError } from '../types';

/**
 * Whitelist-based SVG sanitizer, applied before any SVG is stored.
 * - Unknown elements are removed together with their content (script, foreignObject, image,
 *   animate*, set, style, metadata, editor namespaces...).
 * - Unknown attributes, `on*` handlers, non-internal references and `javascript:` values are removed.
 * - DOCTYPE, entity declarations, comments and processing instructions are never re-emitted,
 *   and DOCTYPE entities are never expanded (XXE / billion laughs).
 */

type XmlNode = Record<string, unknown>;

const ATTR_PREFIX = '@_';
const TEXT_KEY = '#text';
const ATTRS_KEY = ':@';

const ALLOWED_ELEMENTS = new Set([
  'svg', 'g', 'defs', 'title', 'desc',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan',
  'linearGradient', 'radialGradient', 'stop',
  'clipPath', 'mask', 'pattern', 'symbol', 'use',
]);

const ALLOWED_ATTRIBUTES = new Set([
  // Identity and namespaces
  'id', 'class', 'xmlns', 'xmlns:xlink', 'xml:space', 'version', 'baseProfile',
  // Internal references (value checked separately)
  'href', 'xlink:href',
  // Geometry
  'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'fr',
  'width', 'height', 'd', 'points', 'pathLength', 'dx', 'dy', 'rotate', 'textLength', 'lengthAdjust',
  'viewBox', 'preserveAspectRatio', 'transform', 'refX', 'refY',
  // Gradients, patterns, clipping, masking
  'gradientUnits', 'gradientTransform', 'spreadMethod', 'offset', 'stop-color', 'stop-opacity',
  'patternUnits', 'patternContentUnits', 'patternTransform',
  'clipPathUnits', 'clip-path', 'clip-rule', 'mask', 'maskUnits', 'maskContentUnits',
  // Presentation
  'fill', 'fill-opacity', 'fill-rule',
  'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity',
  'opacity', 'color', 'display', 'visibility', 'overflow', 'vector-effect', 'shape-rendering', 'paint-order',
  'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
  'text-anchor', 'dominant-baseline', 'alignment-baseline', 'baseline-shift',
  'letter-spacing', 'word-spacing', 'text-decoration', 'writing-mode',
  'style',
]);

const REFERENCE_ATTRIBUTES = new Set(['href', 'xlink:href']);

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
/** Namespace declarations are never copied: the root receives the canonical ones (see sanitizeSvg). */
const NAMESPACE_ATTRIBUTES = new Set(['xmlns', 'xmlns:xlink']);

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: ATTR_PREFIX,
  allowBooleanAttributes: false,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: false,
  // DOCTYPE entities are never expanded; the predefined XML entities are decoded by decodeXmlEntities().
  processEntities: false,
  htmlEntities: false,
  ignoreDeclaration: true,
  ignorePiTags: true,
});

const builder = new XMLBuilder({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: ATTR_PREFIX,
  suppressEmptyNode: true,
  // Re-escapes & < > " ' in text and attribute values.
  processEntities: true,
});

const PREDEFINED_ENTITIES: Record<string, string> = {
  lt: '<',
  gt: '>',
  amp: '&',
  quot: '"',
  apos: "'",
};

/** Single-pass decoding of the predefined XML entities and character references; any other entity stays literal. */
function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (match, ref: string) => {
    if (ref[0] === '#') {
      const codePoint = ref[1] === 'x' || ref[1] === 'X'
        ? Number.parseInt(ref.slice(2), 16)
        : Number.parseInt(ref.slice(1), 10);
      if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > 0x10ffff) {
        return '';
      }
      return String.fromCodePoint(codePoint);
    }
    return PREDEFINED_ENTITIES[ref] ?? match;
  });
}

/** True when every `url(...)` in the value points to an internal fragment (`url(#id)`). */
function hasOnlyInternalUrls(lowerValue: string): boolean {
  const urlPattern = /url\s*\(\s*['"]?\s*([^)'"\s]*)/g;
  let match: RegExpExecArray | null;
  while ((match = urlPattern.exec(lowerValue)) !== null) {
    if (!match[1].startsWith('#')) {
      return false;
    }
  }
  return true;
}

function isSafeAttributeValue(name: string, value: string): boolean {
  // Remove whitespace and control characters used to obfuscate schemes ("java\tscript:").
  const compact = value.replace(/[\u0000- \u007f]+/g, '').toLowerCase();

  if (compact.includes('javascript:') || compact.includes('vbscript:')) {
    return false;
  }
  if (REFERENCE_ATTRIBUTES.has(name)) {
    return value.trim().startsWith('#');
  }
  if (!hasOnlyInternalUrls(value.toLowerCase())) {
    return false;
  }
  if (name === 'style') {
    // CSS escapes could hide url(/expression(; a style attribute needing them is not kept.
    if (value.includes('\\')
      || compact.includes('expression(')
      || compact.includes('@import')
      || compact.includes('behavior:')
      || compact.includes('-moz-binding')) {
      return false;
    }
  }
  return true;
}

function sanitizeAttributes(rawAttributes: unknown): XmlNode | undefined {
  if (!rawAttributes || typeof rawAttributes !== 'object') {
    return undefined;
  }

  const clean: XmlNode = {};
  for (const [key, rawValue] of Object.entries(rawAttributes as XmlNode)) {
    if (!key.startsWith(ATTR_PREFIX) || typeof rawValue !== 'string') {
      continue;
    }
    const name = key.slice(ATTR_PREFIX.length);
    if (name.toLowerCase().startsWith('on') || !ALLOWED_ATTRIBUTES.has(name) || NAMESPACE_ATTRIBUTES.has(name)) {
      continue;
    }
    const value = decodeXmlEntities(rawValue);
    if (!isSafeAttributeValue(name, value)) {
      continue;
    }
    clean[key] = value;
  }

  return Object.keys(clean).length ? clean : undefined;
}

/** Returns the element name of a preserveOrder node, or null for text/other nodes. */
function elementName(node: XmlNode): string | null {
  for (const key of Object.keys(node)) {
    if (key !== ATTRS_KEY && key !== TEXT_KEY) {
      return key;
    }
  }
  return null;
}

function sanitizeNodes(nodes: unknown): XmlNode[] {
  if (!Array.isArray(nodes)) {
    return [];
  }

  const clean: XmlNode[] = [];
  for (const node of nodes as XmlNode[]) {
    if (!node || typeof node !== 'object') {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(node, TEXT_KEY)) {
      const text = node[TEXT_KEY];
      if (typeof text === 'string' || typeof text === 'number') {
        clean.push({ [TEXT_KEY]: decodeXmlEntities(String(text)) });
      }
      continue;
    }

    const name = elementName(node);
    if (!name || !ALLOWED_ELEMENTS.has(name)) {
      continue;
    }

    const cleanNode: XmlNode = { [name]: sanitizeNodes(node[name]) };
    const attributes = sanitizeAttributes(node[ATTRS_KEY]);
    if (attributes) {
      cleanNode[ATTRS_KEY] = attributes;
    }
    clean.push(cleanNode);
  }

  return clean;
}

const INVALID_SVG_MESSAGE = 'Image SVG invalide.';

/**
 * Sanitizes an SVG document and returns the rebuilt markup.
 * @throws AppError(400) when the document cannot be parsed or its root element is not <svg>.
 */
export function sanitizeSvg(input: string): string {
  const source = input.replace(/^﻿/, '');

  const validation = XMLValidator.validate(source);
  if (validation !== true) {
    throw new AppError(400, INVALID_SVG_MESSAGE);
  }

  let parsed: unknown;
  try {
    parsed = parser.parse(source);
  } catch {
    throw new AppError(400, INVALID_SVG_MESSAGE);
  }

  const topLevel = Array.isArray(parsed) ? (parsed as XmlNode[]) : [];
  const elements = topLevel.filter((node) => node && typeof node === 'object' && elementName(node) !== null);
  if (elements.length !== 1 || elementName(elements[0]) !== 'svg') {
    throw new AppError(400, 'Image SVG invalide : l\'élément racine doit être <svg>.');
  }

  const [root] = sanitizeNodes(elements);
  // Canonical namespaces (an entity-based xmlns such as Illustrator's "&ns_svg;" is not expanded).
  const usesXlink = JSON.stringify(root).includes(`"${ATTR_PREFIX}xlink:href"`);
  root[ATTRS_KEY] = {
    [`${ATTR_PREFIX}xmlns`]: SVG_NS,
    ...(usesXlink ? { [`${ATTR_PREFIX}xmlns:xlink`]: XLINK_NS } : {}),
    ...((root[ATTRS_KEY] as XmlNode | undefined) ?? {}),
  };
  return builder.build([root]) as string;
}
