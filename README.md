# MUI-Icon Web Component

A lightweight, accessible web component that displays Material UI icons as SVGs. The **entire** [@mui/icons-material](https://www.npmjs.com/package/@mui/icons-material) catalog (2,000+ icons × 5 style variants) is generated locally at build time, then served efficiently through inline common icons plus lazy-loaded per-variant shards — so there is no runtime CDN dependency.

## Features

- Full Material Icons catalog generated at build time from a pinned `@mui/icons-material` version (no runtime CDN fetch)
- Explicit style variants: Filled, Outlined, Rounded, Sharp, and Two-tone
- **Performance-tuned delivery**: ~30 common icons inline for instant first paint; everything else lazy-loaded once per variant and cached across all instances
- Works offline and under strict Content Security Policies
- Custom element that works in any framework or vanilla HTML
- Responsive sizing

## Running locally

The demo pages (`index.html`, `cn/index.html`, `test.html`) must be **served over HTTP** — they will not work if you open the file directly in a browser.

> **Why?** The component is an ES module that uses `import` and `fetch()` to load icon data. Browsers block both of these under the `file://` protocol, so double-clicking the HTML file results in icons that never load (you'll see CORS errors in the browser console). Serving over `http://` fixes this.

1. Install dependencies (first time only). This also generates the icon data via the `prepare` script:

```bash
npm install
```

2. Start the dev server:

```bash
npm start
```

3. Open the `http://localhost:<port>` URL it prints (the port is chosen automatically). The home page is `index.html`; the test page is at `/test.html`.

If the icons still don't appear, the generated icon data is probably missing (it is not committed to the repo). Regenerate it and try again:

```bash
npm run generate-icons   # writes src/icons.common.generated.js and icons/
```

## Usage

### Basic Usage

The component ships as an ES module, so load it with `type="module"`:

```html
<script type="module" src="path/to/mui-icon.js"></script>

<mui-icon name="add"></mui-icon>
```

Icon names are written in kebab-case (e.g. `arrow-back`, `shopping-cart`). The full Material Icons catalog is available by default; PascalCase names from the [catalog](https://mui.com/material-ui/material-icons/) map to kebab-case (e.g. `ShoppingCart` → `shopping-cart`, `QrCode2` → `qr-code-2`).

```html
<!-- Examples of using different MUI Icons -->
<mui-icon name="home"></mui-icon>
<mui-icon name="arrow-back"></mui-icon>
<mui-icon name="shopping-cart"></mui-icon>
<mui-icon name="account-circle"></mui-icon>
```

### Style Variants

Choose any of the five Material Icon styles with the `variant` attribute (defaults to `filled`):

```html
<mui-icon name="visibility" variant="filled"></mui-icon>
<mui-icon name="visibility" variant="outlined"></mui-icon>
<mui-icon name="visibility" variant="rounded"></mui-icon>
<mui-icon name="visibility" variant="sharp"></mui-icon>
<mui-icon name="visibility" variant="two-tone"></mui-icon>
```

### Size Variants

```html
<mui-icon name="add" size="small"></mui-icon>
<mui-icon name="add" size="medium"></mui-icon>
<mui-icon name="add" size="large"></mui-icon>
<mui-icon name="add" size="xlarge"></mui-icon>
```

### Inline Text

The component works as an inline element that inherits the font size of its parent when no size is specified:

```html
<p>Click the <mui-icon name="add"></mui-icon> button to add a new item.</p>
```

### Accessibility Labels

You can make the icon meaningful for assistive technologies by adding a label:

```html
<mui-icon name="favorite" label="Favorite"></mui-icon>
```

## Available Properties

### `name` (required)

Specifies which icon to display, in kebab-case format (e.g. `arrow-back` instead of `ArrowBack`). Any icon from the Material Icons catalog is supported.

For the full catalog of icon names, visit the [Material UI Icons documentation](https://mui.com/material-ui/material-icons/).

### `variant` (optional)

Selects the Material Icon style. One of `filled` (default), `outlined`, `rounded`, `sharp`, or `two-tone`. Available variants are controlled per build in `icons.config.json`. If a requested variant was not generated, the component falls back to `filled`.

### `loading` (optional)

Overrides the [loading strategy](#loading-strategies) for this element: `common`, `full`, or `subset`. When omitted, the element uses the global default set via `MuiIcon.configure()` (which itself defaults to `full`).

### `size` (optional)

Controls the size of the icon:

- `small`: 16px (1rem)
- `medium`: 24px (1.5rem)
- `large`: 32px (2rem)
- `xlarge`: 48px (3rem)

When no size is specified, the icon inherits the font size of its parent container.

### `label` (optional)

Provides an accessible name for the icon when it should be meaningful to assistive technology users. When not provided, the icon is treated as decorative and hidden from assistive technologies.

## CSS Custom Properties

You can customize the icon size and color by setting these CSS custom properties to your desired values:

```css
mui-icon {
  --icon-size-small: 1rem;
  --icon-size-medium: 1.5rem;
  --icon-size-large: 2rem;
  --icon-size-xlarge: 3rem;
  --icon-color: crimson;
}
```

## How It Works

Icon data is generated at **build time** and delivered with a performance-tuned runtime strategy.

**Build time** (`npm run generate-icons` → `src/scripts/generate-icons.mjs`):

1. `@mui/icons-material` is installed as a dev dependency (pinned version).
2. The generator enumerates the catalog (or an allowlist), reads SVG path data straight out of the installed package — preserving multi-path artwork such as two-tone overlays — and emits:
   - `icons/<variant>.json` — one lazy-loadable shard per style variant.
   - `icons/index.json` — a lightweight names index (source version, variants, all icon names).
   - `src/icons.common.generated.js` — a small inline subset embedded in the component.

**Runtime** (the `<mui-icon>` component):

1. **Common icons** (configured via `inlineCommon`) are embedded in the bundle and render **synchronously** on first paint — zero network.
2. For any other icon, the component loads data according to the active [loading strategy](#loading-strategies) (whole-variant shard, per-icon file, or inline-only), caching results in a module-level store **shared across every instance**.
3. Data files are located relative to the component via `import.meta.url`, so they resolve correctly no matter where the page importing it lives.

This keeps the initial payload tiny while making the entire catalog available on demand, with no runtime CDN request and full offline/CSP support.

## Loading strategies

Consumers decide **how much icon data to load at runtime** — without rebuilding — by choosing a loading strategy:

| Strategy         | What it loads                                                                          | Best for                                                         |
| ---------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `common`         | Only the icons inlined in the bundle. Never fetches; non-inlined icons render nothing. | Pages that use just the common set and want zero extra requests. |
| `full` (default) | The whole variant shard (`icons/<variant>.json`) on first use, cached and shared.      | Pages using many icons of a given style.                         |
| `subset`         | Individual per-icon files (`icons/<variant>/<name>.json`) on demand.                   | Pages using only a handful of catalog icons.                     |

Set a **global default** and optionally warm the cache:

```javascript
import { MuiIcon } from './mui-icon.js';

MuiIcon.configure({
  loading: 'subset',
  preload: ['rocket-launch', 'outlined/water-drop'], // "name" or "variant/name"
});
```

Or override **per element** with the `loading` attribute:

```html
<mui-icon name="rocket-launch" loading="subset"></mui-icon> <mui-icon name="home" loading="common"></mui-icon>
```

> The `subset` strategy requires the per-icon files, which are emitted when `emitPerIcon` is `true` in `icons.config.json` (the default).

> The generated files (`icons/`, `src/icons.common.generated.js`) and the `dist/` output are build artifacts and are not committed to version control. Run `npm run build` (or `npm run generate-icons`) to produce them.

## Configuration

Edit `icons.config.json`, then run `npm run generate-icons`:

- `mode`: `"all"` bundles the entire catalog; `"allowlist"` bundles only the icons in the `allowlist` array (smaller output).
- `variants`: which styles to generate (`filled`, `outlined`, `rounded`, `sharp`, `two-tone`).
- `inlineCommon`: kebab-case icon names to embed in the component for instant first paint.
- `emitPerIcon`: when `true` (default), also writes per-icon files used by the `subset` loading strategy. Set to `false` to skip them.
- `allowlist`: icon names used only when `mode` is `"allowlist"`.

The generator reports the SVG count, per-variant shard sizes, and warns about names it could not resolve against `@mui/icons-material`.

## JavaScript API

The component is also exported as a class:

```javascript
import { MuiIcon } from './mui-icon.js';

MuiIcon.sourceVersion; // e.g. "9.1.1"
MuiIcon.variants; // ["filled", "outlined", ...]
MuiIcon.loadingStrategies; // ["common", "full", "subset"]
MuiIcon.configure({ loading, preload }); // set global default loading + warm cache
await MuiIcon.getAvailableIcons(); // Promise<string[]> — full names list (loads icons/index.json)
```

## Accessibility

- Icons without a `label` attribute are hidden from screen readers with `aria-hidden="true"`
- Icons with a `label` attribute use `role="img"` and `aria-label` to provide an accessible name

### WCAG 2.2 Conformance

- **1.1.1 Non-text Content** - Icons are either decorative or have text alternatives when meaningful
- **2.5.3 Label in Name** - When labels are provided, they describe the icon's meaning
- **4.1.2 Name, Role, Value** - Proper role and accessible name are provided

## Testing

Automated tests run on Node's built-in test runner (no extra dependencies):

```bash
npm test
```

This covers the pure helpers (name conversion, SVG path extraction including two-tone overlays) and the integrity of the generated icon data (shards, per-icon files, inline common set). The data-integrity tests are skipped automatically if the icon data has not been generated yet — run `npm run generate-icons` first to exercise them.

For manual, in-browser checks of the rendered component, start the dev server and open the test page:

```bash
npm start   # then open the printed URL at /test.html
```

## Browser Support

This component works in all modern browsers that support Custom Elements v1 (Web Components):

- Chrome/Edge
- Firefox
- Safari
- Opera

## Installation

1. Build the component to produce the `dist/` output (this also generates the icon manifest):

```bash
npm install
npm run build
```

2. Include the built file as an ES module. `mui-icon.js` imports `src/icons.common.generated.js` and lazy-loads `icons/<variant>.json` (and, for the `subset` strategy, `icons/<variant>/<name>.json`) relative to itself, so keep the `dist/` folder structure intact when deploying. Serve over HTTP, not `file://`.

```html
<script type="module" src="path/to/dist/mui-icon.js"></script>
```

Or import it in your JavaScript:

```javascript
import './path/to/dist/mui-icon.js';
```

## Performance

- Common icons (configured in `inlineCommon`) render synchronously with no network request.
- Each style variant's full icon set is loaded on demand as a single JSON shard, fetched once and cached for the page lifetime and shared across all `<mui-icon>` instances.
- If you only need a subset of icons, set `mode: "allowlist"` in `icons.config.json` to shrink the shards. Limiting `variants` reduces the number of shards.
- Shards are static JSON, so they cache well via standard HTTP caching/CDN headers.
