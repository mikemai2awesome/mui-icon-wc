/**
 * Integration tests for the generated icon data.
 *
 * These validate the real output of `npm run generate-icons`. If the data has
 * not been generated yet, the suite is skipped (rather than failing) so that
 * `npm test` works in a fresh checkout; run `npm run generate-icons` first to
 * exercise these.
 *
 * Run with: node --test  (or npm test)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const iconsDir = join(projectRoot, 'icons');
const indexPath = join(iconsDir, 'index.json');

const generated = existsSync(indexPath);
const skip = generated ? false : 'icons not generated — run `npm run generate-icons`';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('index.json has the expected shape', { skip }, () => {
  const index = readJson(indexPath);
  assert.equal(typeof index.sourceVersion, 'string');
  assert.ok(Array.isArray(index.variants) && index.variants.length > 0);
  assert.ok(Array.isArray(index.names) && index.names.length > 0);
  assert.ok(index.variants.includes(index.defaultVariant));
});

test('every declared variant shard exists and is non-empty', { skip }, () => {
  const index = readJson(indexPath);
  for (const variant of index.variants) {
    const shardPath = join(iconsDir, `${variant}.json`);
    assert.ok(existsSync(shardPath), `${variant}.json should exist`);
    const shard = readJson(shardPath);
    assert.ok(Object.keys(shard).length > 0, `${variant}.json should not be empty`);
  }
});

test('a known icon is present in the default shard and is a valid 24x24 svg', { skip }, () => {
  const index = readJson(indexPath);
  const shard = readJson(join(iconsDir, `${index.defaultVariant}.json`));
  const svg = shard.add;
  assert.equal(typeof svg, 'string');
  assert.match(svg, /^<svg[^>]*viewBox="0 0 24 24">/);
  assert.match(svg, /<path /);
  assert.match(svg, /<\/svg>$/);
});

test('two-tone visibility keeps its multi-path opacity overlay', { skip }, () => {
  const index = readJson(indexPath);
  if (!index.variants.includes('two-tone')) return;
  const shard = readJson(join(iconsDir, 'two-tone.json'));
  const svg = shard.visibility;
  assert.equal(typeof svg, 'string');
  const pathCount = (svg.match(/<path /g) || []).length;
  assert.equal(pathCount, 2);
  assert.match(svg, /opacity=/);
});

test('per-icon files match the shard when enabled', { skip }, () => {
  const index = readJson(indexPath);
  if (!index.perIcon) return;
  const variant = index.defaultVariant;
  const shard = readJson(join(iconsDir, `${variant}.json`));
  const perIcon = readJson(join(iconsDir, variant, 'add.json'));
  assert.equal(perIcon.svg, shard.add);
});

test('inline common module exports a non-empty common set', { skip }, async () => {
  const commonPath = join(projectRoot, 'src', 'icons.common.generated.js');
  if (!existsSync(commonPath)) {
    assert.fail('icons.common.generated.js missing — run `npm run generate-icons`');
  }
  const mod = await import(commonPath);
  assert.equal(typeof mod.ICON_SOURCE_VERSION, 'string');
  assert.ok(Array.isArray(mod.ICON_VARIANTS) && mod.ICON_VARIANTS.length > 0);
  assert.ok(Object.keys(mod.COMMON_ICONS).length > 0);
  assert.ok('home' in mod.COMMON_ICONS, 'common set should include home');
});
