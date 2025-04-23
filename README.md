# MUI-Icon Web Component

A lightweight, accessible web component that displays Material UI icons as SVGs. This component dynamically loads icons from the official [@mui/icons-material](https://www.npmjs.com/package/@mui/icons-material) package, allowing you to use any Material UI icon without the full library dependency.

## Features

- Dynamically loads any icon from the MUI Icons library
- Custom element that works in any framework or vanilla HTML
- Responsive sizing

## Usage

### Basic Usage

```html
<mui-icon name="add"></mui-icon>
```

You can use any icon name from the Material UI icons library. The component will automatically convert kebab-case (like `arrow-back`) to PascalCase with an "Icon" suffix (like `ArrowBackIcon`) when fetching from the MUI library.

```html
<!-- Examples of using different MUI Icons -->
<mui-icon name="home"></mui-icon>
<mui-icon name="arrow-back"></mui-icon>
<mui-icon name="shopping-cart"></mui-icon>
<mui-icon name="account-circle"></mui-icon>
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

Specifies which icon to display. You can use any icon name from the Material UI icons library. The name should be in kebab-case format (e.g., `arrow-back` instead of `ArrowBack`).

For a complete list of all available icons, visit the [Material UI Icons documentation](https://mui.com/material-ui/material-icons/).

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

The component dynamically fetches icon SVG paths from the MUI Icons package through unpkg.com CDN. It converts the icon name from kebab-case to PascalCase and adds the "Icon" suffix to match MUI's naming convention.

For example:

- `add` → `AddIcon`
- `arrow-back` → `ArrowBackIcon`
- `shopping-cart` → `ShoppingCartIcon`

The component includes a small set of built-in common icons to reduce network requests and provide faster rendering for frequently used icons.

### Advanced Path Resolution

For more reliability, the component tries multiple potential paths for each icon:

- Standard ESM path
- Path without "Icon" suffix
- Lib path
- Paths with various style suffixes (Outlined, Rounded, Sharp, TwoTone)

This ensures maximum compatibility with the MUI Icons library and helps resolve edge cases.

## Accessibility

- Icons without a `label` attribute are hidden from screen readers with `aria-hidden="true"`
- Icons with a `label` attribute use `role="img"` and `aria-label` to provide an accessible name

### WCAG 2.2 Conformance

- **1.1.1 Non-text Content** - Icons are either decorative or have text alternatives when meaningful
- **2.5.3 Label in Name** - When labels are provided, they describe the icon's meaning
- **4.1.2 Name, Role, Value** - Proper role and accessible name are provided

## Browser Support

This component works in all modern browsers that support Custom Elements v1 (Web Components):

- Chrome/Edge
- Firefox
- Safari
- Opera

## Installation

1. Download the `mui-icon.js` file from the `dist` folder (or use `mui-icon.min.js` for production)
2. Include it in your HTML:

```html
<script src="path/to/mui-icon.js"></script>
```

Or import it in your JavaScript:

```javascript
import './path/to/mui-icon.js';
```

## Caching and Performance

The component caches icons after they've been loaded to improve performance and reduce network requests. If you use the same icon multiple times on your page, it will only be fetched once.
