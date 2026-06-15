/**
 * Unit tests for the pure icon helpers.
 *
 * Run with: node --test  (or npm test)
 * No external dependencies — uses the built-in node:test runner.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { toKebabCase, toPascalCase, extractPaths, pathsToSvg, svgFromModuleSource } from './icon-utils.mjs';

test('toKebabCase: simple PascalCase', () => {
  assert.equal(toKebabCase('Add'), 'add');
});

test('toKebabCase: multi-word PascalCase', () => {
  assert.equal(toKebabCase('ShoppingCart'), 'shopping-cart');
});

test('toKebabCase: trailing digit', () => {
  assert.equal(toKebabCase('QrCode2'), 'qr-code-2');
});

test('toKebabCase: leading acronym', () => {
  assert.equal(toKebabCase('AcUnit'), 'ac-unit');
});

test('toKebabCase: digit then word', () => {
  assert.equal(toKebabCase('SignalCellular4Bar'), 'signal-cellular-4-bar');
});

test('toKebabCase: word number form', () => {
  assert.equal(toKebabCase('ThreeDRotation'), 'three-d-rotation');
});

test('toPascalCase: single word', () => {
  assert.equal(toPascalCase('add'), 'Add');
});

test('toPascalCase: multi-word', () => {
  assert.equal(toPascalCase('shopping-cart'), 'ShoppingCart');
});

test('toPascalCase: ignores empty segments', () => {
  assert.equal(toPascalCase('arrow--back'), 'ArrowBack');
});

test('extractPaths: single path with d', () => {
  const source = '_jsx("path", { d: "M19 13h-6z" })';
  const paths = extractPaths(source);
  assert.equal(paths.length, 1);
  assert.equal(paths[0].d, 'M19 13h-6z');
});

test('extractPaths: two-tone overlay keeps opacity and both paths', () => {
  const source = '[_jsx("path", { d: "M1 1z", opacity: ".3" }, "0"), _jsx("path", { d: "M2 2z" }, "1")]';
  const paths = extractPaths(source);
  assert.equal(paths.length, 2);
  assert.equal(paths[0].opacity, '.3');
  assert.equal(paths[1].d, 'M2 2z');
  assert.equal(paths[1].opacity, undefined);
});

test('extractPaths: captures fillRule and clipRule as kebab attrs', () => {
  const source = '_jsx("path", { d: "M0 0z", fillRule: "evenodd", clipRule: "evenodd" })';
  const paths = extractPaths(source);
  assert.equal(paths[0]['fill-rule'], 'evenodd');
  assert.equal(paths[0]['clip-rule'], 'evenodd');
});

test('extractPaths: returns empty when no path element', () => {
  assert.deepEqual(extractPaths('export default createSvgIcon(null)'), []);
});

test('pathsToSvg: wraps a single path in a 24x24 svg', () => {
  const svg = pathsToSvg([{ d: 'M0 0z' }]);
  assert.equal(svg, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0z"/></svg>');
});

test('pathsToSvg: serializes opacity attribute', () => {
  const svg = pathsToSvg([{ d: 'M0 0z', opacity: '.3' }]);
  assert.equal(svg, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0z" opacity=".3"/></svg>');
});

test('svgFromModuleSource: produces svg from a realistic module', () => {
  const source = 'import createSvgIcon from "./utils/createSvgIcon.mjs";\nexport default createSvgIcon(_jsx("path", { d: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" }), "Add");';
  const svg = svgFromModuleSource(source);
  assert.equal(svg, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>');
});

test('svgFromModuleSource: returns null when there is no path data', () => {
  assert.equal(svgFromModuleSource('export default 42;'), null);
});
