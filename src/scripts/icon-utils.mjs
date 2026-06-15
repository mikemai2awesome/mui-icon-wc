/**
 * Pure helpers shared by the icon generator and its test suite.
 *
 * These functions have no side effects and depend only on their arguments, so
 * they are trivially testable in isolation.
 */

export const VARIANT_SUFFIX = {
  filled: '',
  outlined: 'Outlined',
  rounded: 'Rounded',
  sharp: 'Sharp',
  'two-tone': 'TwoTone',
};

export const ALL_SUFFIXES = ['Outlined', 'Rounded', 'Sharp', 'TwoTone'];

/** PascalCase MUI module name -> kebab-case icon name. Verified collision-free across the catalog. */
export function toKebabCase(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-zA-Z])([0-9])/g, '$1-$2')
    .replace(/([0-9])([a-zA-Z])/g, '$1-$2')
    .toLowerCase();
}

/** kebab-case -> PascalCase, for resolving allowlist entries to module names. */
export function toPascalCase(name) {
  return name
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Extract every `_jsx("path", { ... })` element, preserving attributes so
 * multi-path artwork (e.g. two-tone overlays) survives intact.
 */
export function extractPaths(source) {
  const paths = [];
  const blockPattern = /_jsx\(\s*["']path["']\s*,\s*\{([^}]*)\}/g;
  let block;

  while ((block = blockPattern.exec(source)) !== null) {
    const body = block[1];
    const attrs = {};

    const d = body.match(/\bd\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (!d) continue;
    attrs.d = d[1];

    const opacity = body.match(/\bopacity\s*:\s*"?([\d.]+)"?/);
    if (opacity) attrs.opacity = opacity[1];

    const fillOpacity = body.match(/\bfillOpacity\s*:\s*"?([\d.]+)"?/);
    if (fillOpacity) attrs['fill-opacity'] = fillOpacity[1];

    const fillRule = body.match(/\bfillRule\s*:\s*"([^"]+)"/);
    if (fillRule) attrs['fill-rule'] = fillRule[1];

    const clipRule = body.match(/\bclipRule\s*:\s*"([^"]+)"/);
    if (clipRule) attrs['clip-rule'] = clipRule[1];

    paths.push(attrs);
  }

  return paths;
}

export function pathsToSvg(paths) {
  const inner = paths
    .map(
      attrs =>
        '<path ' +
        Object.entries(attrs)
          .map(([key, value]) => `${key}="${value}"`)
          .join(' ') +
        '/>'
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${inner}</svg>`;
}

export function svgFromModuleSource(source) {
  const paths = extractPaths(source);
  return paths.length ? pathsToSvg(paths) : null;
}
