/**
 * MUI Icon Web Component
 *
 * Renders Material UI icons as inline SVGs from a locally generated catalog.
 *
 * Consumers choose how much icon data to load at runtime via a `loading` strategy
 * (global default through MuiIcon.configure(), or per-element `loading` attribute):
 *
 *   - "common": render only the icons inlined in the bundle (COMMON_ICONS).
 *               Zero network. Non-inlined icons render nothing.
 *   - "full"   (default): lazy-load the whole variant shard (./icons/<variant>.json)
 *               on first use, cached and shared across instances. Best when many
 *               icons of a style are used.
 *   - "subset": fetch individual per-icon files (./icons/<variant>/<name>.json) on
 *               demand. Best when only a handful of catalog icons are used.
 *
 * Icon data is produced at build time by src/scripts/generate-icons.mjs from the
 * installed @mui/icons-material package; there is no runtime CDN dependency.
 */

import { COMMON_ICONS, ICON_VARIANTS, DEFAULT_VARIANT, ICON_SOURCE_VERSION } from './src/icons.common.generated.js';

/** Resolve the directory this module lives in so icon data loads relative to it. */
const SHARD_BASE = new URL('./icons/', import.meta.url);

const LOADING_STRATEGIES = new Set(['common', 'full', 'subset']);

/** Global runtime config, overridable via MuiIcon.configure(). */
const config = {
  loading: 'full',
};

/** Shared across all instances: variant -> { name: svg } (once a shard is loaded). */
const variantCache = new Map();
/** Shared across all instances: variant -> Promise (in-flight shard load dedupe). */
const variantLoads = new Map();
/** Shared across all instances: "variant/name" -> svg|null (per-icon, subset mode). */
const iconCache = new Map();
/** Shared across all instances: "variant/name" -> Promise (in-flight per-icon dedupe). */
const iconLoads = new Map();

const STYLES = `
  @layer config {
    :host {
      --icon-size-small: 1rem;
      --icon-size-medium: 1.5rem;
      --icon-size-large: 2rem;
      --icon-size-xlarge: 3rem;
      --icon-color: currentColor;
    }
  }

  @layer components {
    :host {
      display: inline-block;
      line-height: 1;
      vertical-align: middle;
      color: var(--icon-color);
    }

    :host(:not([size])) {
      font-size: inherit;
    }

    :host([size="small"]) {
      font-size: var(--icon-size-small);
    }

    :host([size="medium"]) {
      font-size: var(--icon-size-medium);
    }

    :host([size="large"]) {
      font-size: var(--icon-size-large);
    }

    :host([size="xlarge"]) {
      font-size: var(--icon-size-xlarge);
    }

    .icon-wrapper {
      display: inline-grid;
      place-items: center;
      line-height: 1;
    }

    svg {
      inline-size: 1.55cap;
      block-size: 1.55cap;
      fill: currentColor;
    }
  }
`;

function normalizeVariant(variant) {
  return ICON_VARIANTS.includes(variant) ? variant : DEFAULT_VARIANT;
}

function normalizeLoading(value) {
  return value && LOADING_STRATEGIES.has(value) ? value : config.loading;
}

async function loadVariantShard(variant) {
  if (variantCache.has(variant)) return variantCache.get(variant);
  if (variantLoads.has(variant)) return variantLoads.get(variant);

  const load = fetch(new URL(`${variant}.json`, SHARD_BASE))
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      variantCache.set(variant, data);
      variantLoads.delete(variant);
      return data;
    })
    .catch(error => {
      variantLoads.delete(variant);
      console.error(`<mui-icon>: failed to load "${variant}" icon shard — ${error.message}`);
      const empty = {};
      variantCache.set(variant, empty);
      return empty;
    });

  variantLoads.set(variant, load);
  return load;
}

async function loadSingleIcon(name, variant) {
  const key = `${variant}/${name}`;
  if (iconCache.has(key)) return iconCache.get(key);
  if (iconLoads.has(key)) return iconLoads.get(key);

  const load = fetch(new URL(`${variant}/${name}.json`, SHARD_BASE))
    .then(response => (response.ok ? response.json() : null))
    .then(data => {
      const svg = data && data.svg ? data.svg : null;
      iconCache.set(key, svg);
      iconLoads.delete(key);
      return svg;
    })
    .catch(error => {
      iconLoads.delete(key);
      console.error(`<mui-icon>: failed to load icon "${name}" (${variant}) — ${error.message}`);
      iconCache.set(key, null);
      return null;
    });

  iconLoads.set(key, load);
  return load;
}

/** Synchronous lookup: inline-common, an already-loaded shard, or an already-loaded single icon. */
function resolveSync(name, variant) {
  if (variant === DEFAULT_VARIANT && name in COMMON_ICONS) return COMMON_ICONS[name];
  const shard = variantCache.get(variant);
  if (shard && shard[name]) return shard[name];
  const key = `${variant}/${name}`;
  return iconCache.has(key) ? iconCache.get(key) : null;
}

class MuiIcon extends HTMLElement {
  static get observedAttributes() {
    return ['name', 'size', 'variant', 'label', 'loading'];
  }

  static get sourceVersion() {
    return ICON_SOURCE_VERSION;
  }

  static get variants() {
    return ICON_VARIANTS;
  }

  static get loadingStrategies() {
    return [...LOADING_STRATEGIES];
  }

  /**
   * Set the global default loading behavior for every <mui-icon>.
   *   loading: "common" | "full" | "subset"  (default "full")
   *   preload: array of icon names to warm the cache for, e.g. ["rocket-launch"].
   *            Names may be "name" (default variant) or "variant/name".
   * Returns the resolved config.
   */
  static configure(options = {}) {
    if (options.loading != null) {
      if (LOADING_STRATEGIES.has(options.loading)) {
        config.loading = options.loading;
      } else {
        console.warn(`<mui-icon>: ignoring unknown loading strategy "${options.loading}".`);
      }
    }
    if (Array.isArray(options.preload)) {
      for (const entry of options.preload) {
        const [a, b] = String(entry).split('/');
        const variant = b ? normalizeVariant(a) : DEFAULT_VARIANT;
        const name = b || a;
        if (config.loading === 'subset') loadSingleIcon(name, variant);
        else loadVariantShard(variant);
      }
    }
    return { ...config };
  }

  /** Resolves to the full list of valid icon names (lazy-loads the names index). */
  static async getAvailableIcons() {
    const response = await fetch(new URL('index.json', SHARD_BASE));
    const index = await response.json();
    return index.names;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._renderToken = 0;
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(_name, oldValue, newValue) {
    if (oldValue !== newValue) this.render();
  }

  paint(iconSvg) {
    if (!iconSvg) {
      this.shadowRoot.replaceChildren();
      return;
    }
    const hasLabel = this.hasAttribute('label');
    const ariaAttrs = hasLabel ? `role="img" aria-label="${this.getAttribute('label')}"` : 'aria-hidden="true"';
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <span class="icon-wrapper" ${ariaAttrs}>
        ${iconSvg}
      </span>
    `;
  }

  render() {
    const name = this.getAttribute('name');
    const token = ++this._renderToken;

    if (!name) {
      this.shadowRoot.replaceChildren();
      return;
    }

    const variant = normalizeVariant(this.getAttribute('variant') || DEFAULT_VARIANT);
    const loading = normalizeLoading(this.getAttribute('loading'));

    // Fast path: inline-common or already-cached data renders synchronously.
    const immediate = resolveSync(name, variant);
    if (immediate) {
      this.paint(immediate);
      return;
    }

    // "common" never fetches: render nothing for non-inlined icons.
    if (loading === 'common') {
      console.warn(`<mui-icon>: icon "${name}" is not in the inline common set and loading="common" disables fetching.`);
      this.paint(null);
      return;
    }

    // Slow path: load via the chosen strategy, then resolve (ignore stale renders).
    const loader = loading === 'subset' ? loadSingleIcon(name, variant) : loadVariantShard(variant).then(shard => shard[name] || null);

    loader.then(svg => {
      if (token !== this._renderToken) return;
      if (!svg) {
        console.warn(`<mui-icon>: icon "${name}" (variant "${variant}") not found in the catalog.`);
      }
      this.paint(svg || null);
    });
  }
}

customElements.define('mui-icon', MuiIcon);

export { MuiIcon };
