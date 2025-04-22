# Installation Guide

## Installing with npm

1. Install the package in your project:

```bash
npm install web-component-icon
```

2. Import the component in your JavaScript file:

```javascript
// Option 1: Import directly in your JavaScript
import 'web-component-icon';

// Option 2: Or if you're using ES modules in the browser
// Add to your HTML file:
// <script type="module">
//   import 'web-component-icon';
// </script>
```

3. Use the component in your HTML:

```html
<mui-icon name="home"></mui-icon>
<mui-icon name="shopping-cart" size="large"></mui-icon>
<mui-icon name="favorite" label="Like" size="medium"></mui-icon>
```

## Manual Installation

If you prefer not to use npm, you can include the component directly:

1. Download the [`mui-icon.js`](https://github.com/yourusername/web-component-icon/releases/latest/download/mui-icon.min.js) file from the latest release

2. Include it in your HTML:

```html
<script src="path/to/mui-icon.min.js"></script>
```

3. Use the component in your HTML:

```html
<mui-icon name="home"></mui-icon>
```

## CDN Usage

You can also use the component directly from a CDN:

```html
<script src="https://unpkg.com/web-component-icon@latest/dist/mui-icon.min.js"></script>
```

## Framework Integration

### React

```jsx
import React, { useEffect } from 'react';
import 'web-component-icon';

function App() {
  // Use the component in your React app
  return (
    <div>
      <mui-icon name="home" size="large"></mui-icon>
    </div>
  );
}
```

### Vue

```vue
<template>
  <div>
    <mui-icon name="favorite" size="large"></mui-icon>
  </div>
</template>

<script>
import 'web-component-icon';

export default {
  name: 'App'
}
</script>
```

### Angular

```typescript
// In your app.module.ts
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';

// Import the web component
import 'web-component-icon';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // This allows using web components in templates
  bootstrap: [AppComponent]
})
export class AppModule {}
```

Then in your component:

```html
<mui-icon name="add" size="large"></mui-icon>
``` 