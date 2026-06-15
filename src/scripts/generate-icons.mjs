/**
 * Build-time icon generator.
 *
 * Reads icons.config.json and pulls SVG path data straight out of the installed
 * @mui/icons-material package, emitting:
 *
 *   icons/<variant>.json           Lazy-loaded shard: { "<kebab-name>": "<svg>" }
 *   icons/<variant>/<name>.json    Per-icon file: { "svg": "<svg>" } (subset mode)
 *   icons/index.json               Metadata: source version, variants, all names.
 *   src/icons.common.generated.js  Inline subset for instant first paint.
 *
 * The <mui-icon> component supports three runtime loading strategies:
 *   - "common": render only the inlined set, no network.
 *   - "full":   lazy-load a whole variant shard on demand (cached across instances).
 *   - "subset": fetch individual per-icon files on demand.
 * This replaces runtime unpkg scraping: data is versioned against an explicit
 * dependency, resolved deterministically at build time, and served locally.
 */

import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { VARIANT_SUFFIX, ALL_SUFFIXES, toKebabCase, toPascalCase, svgFromModuleSource } from './icon-utils.mjs';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(here, '..', '..');
const iconsPackageDir = dirname(require.resolve('@mui/icons-material/package.json'));
const iconsPackageVersion = require('@mui/icons-material/package.json').version;

async function readIconModule(moduleName) {
  for (const ext of ['.mjs', '.js']) {
    try {
      return await readFile(join(iconsPackageDir, moduleName + ext), 'utf8');
    } catch {
      // try next extension
    }
  }
  return null;
}

/** Enumerate every base (filled) icon module name in the package. */
async function listBaseModuleNames() {
  const files = await readdir(iconsPackageDir);
  const moduleNames = files.filter(f => f.endsWith('.mjs') && f !== 'index.mjs').map(f => f.slice(0, -4));
  const all = new Set(moduleNames);

  const isVariant = name => {
    for (const suffix of ALL_SUFFIXES) {
      if (name.endsWith(suffix) && all.has(name.slice(0, -suffix.length))) return true;
    }
    return false;
  };

  return moduleNames.filter(name => !isVariant(name)).sort();
}

async function resolveBaseModuleNames(config) {
  if (config.mode === 'all') {
    return listBaseModuleNames();
  }
  // allowlist mode: map kebab names -> Pascal module names
  const list = Array.isArray(config.allowlist) ? config.allowlist : [];
  return list.map(toPascalCase);
}

async function main() {
  const config = JSON.parse(await readFile(join(projectRoot, 'icons.config.json'), 'utf8'));
  const mode = config.mode === 'allowlist' ? 'allowlist' : 'all';

  const requestedVariants = Array.isArray(config.variants) && config.variants.length ? config.variants : ['filled'];
  const variants = requestedVariants.filter(v => {
    if (!(v in VARIANT_SUFFIX)) {
      console.warn(`Skipping unknown variant "${v}" (valid: ${Object.keys(VARIANT_SUFFIX).join(', ')})`);
      return false;
    }
    return true;
  });

  const baseModuleNames = await resolveBaseModuleNames(config);

  // Build one shard per variant: { kebabName: svg }.
  const shards = Object.fromEntries(variants.map(v => [v, {}]));
  const allNames = new Set();
  const missing = [];
  let svgCount = 0;

  for (const baseName of baseModuleNames) {
    const kebab = toKebabCase(baseName);

    for (const variant of variants) {
      const moduleName = baseName + VARIANT_SUFFIX[variant];
      const source = await readIconModule(moduleName);
      if (!source) {
        missing.push(`${kebab} (${variant} -> ${moduleName})`);
        continue;
      }
      const svg = svgFromModuleSource(source);
      if (!svg) {
        missing.push(`${kebab} (${variant} -> ${moduleName}: no path data)`);
        continue;
      }
      shards[variant][kebab] = svg;
      allNames.add(kebab);
      svgCount++;
    }
  }

  // Inline-common module: a small subset embedded directly in the component.
  const inlineCommonNames = Array.isArray(config.inlineCommon) ? config.inlineCommon : [];
  const inlineCommon = {};
  const defaultVariant = variants.includes('filled') ? 'filled' : variants[0];
  for (const name of inlineCommonNames) {
    const svg = shards[defaultVariant] && shards[defaultVariant][name];
    if (svg) inlineCommon[name] = svg;
    else console.warn(`inlineCommon: "${name}" not found in "${defaultVariant}" shard; skipping.`);
  }

  // Write outputs to both the dev location (icons/) and is copied to dist/ by the build.
  const iconsOutDir = join(projectRoot, 'icons');
  await rm(iconsOutDir, { recursive: true, force: true });
  await mkdir(iconsOutDir, { recursive: true });

  const shardSizes = {};
  for (const variant of variants) {
    const json = JSON.stringify(shards[variant]);
    await writeFile(join(iconsOutDir, `${variant}.json`), json, 'utf8');
    shardSizes[variant] = json.length;
  }

  // Per-icon files for "subset" runtime loading (opt-out via emitPerIcon: false).
  const emitPerIcon = config.emitPerIcon !== false;
  let perIconCount = 0;
  if (emitPerIcon) {
    for (const variant of variants) {
      const variantDir = join(iconsOutDir, variant);
      await mkdir(variantDir, { recursive: true });
      const entries = Object.entries(shards[variant]);
      // Write concurrently in batches to keep the file-handle count bounded.
      const batchSize = 256;
      for (let i = 0; i < entries.length; i += batchSize) {
        await Promise.all(entries.slice(i, i + batchSize).map(([name, svg]) => writeFile(join(variantDir, `${name}.json`), JSON.stringify({ svg }), 'utf8')));
        perIconCount += Math.min(batchSize, entries.length - i);
      }
    }
  }

  const index = {
    sourceVersion: iconsPackageVersion,
    mode,
    variants,
    defaultVariant,
    perIcon: emitPerIcon,
    names: [...allNames].sort(),
  };
  await writeFile(join(iconsOutDir, 'index.json'), JSON.stringify(index), 'utf8');

  const banner = '/**\n' + ' * AUTO-GENERATED FILE — DO NOT EDIT.\n' + ` * Generated by src/scripts/generate-icons.mjs from @mui/icons-material@${iconsPackageVersion}.\n` + ' * Edit icons.config.json and run `npm run generate-icons` to regenerate.\n' + ' */\n';

  const commonContents =
    banner + `export const ICON_SOURCE_VERSION = ${JSON.stringify(iconsPackageVersion)};\n` + `export const ICON_VARIANTS = ${JSON.stringify(variants)};\n` + `export const DEFAULT_VARIANT = ${JSON.stringify(defaultVariant)};\n` + `export const COMMON_ICONS = ${JSON.stringify(inlineCommon)};\n`;
  await writeFile(join(projectRoot, 'src', 'icons.common.generated.js'), commonContents, 'utf8');

  // Report.
  const kb = n => (n / 1024).toFixed(1) + 'KB';
  console.log(`Mode: ${mode}`);
  console.log(`Generated ${svgCount} SVGs across ${allNames.size} icons x ${variants.length} variant(s).`);
  console.log(`Source: @mui/icons-material@${iconsPackageVersion}`);
  console.log(`Inline-common icons embedded: ${Object.keys(inlineCommon).length}`);
  console.log('Per-variant shard sizes:');
  for (const variant of variants) console.log(`  - ${variant}.json: ${kb(shardSizes[variant])}`);
  console.log(`Per-icon files (subset mode): ${emitPerIcon ? perIconCount : 'disabled'}`);
  console.log(`Output: ${iconsOutDir}/ and src/icons.common.generated.js`);

  if (missing.length) {
    console.warn(`\n${missing.length} icon/variant combination(s) could not be resolved (first 10 shown):`);
    for (const entry of missing.slice(0, 10)) console.warn(`  - ${entry}`);
  }
}

main().catch(error => {
  console.error('Icon generation failed:', error);
  process.exit(1);
});
