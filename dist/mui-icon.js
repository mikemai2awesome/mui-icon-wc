/**
 * MUI Icon Web Component
 * A custom element that renders SVG icons based on the Material UI icon set
 */

class MuiIcon extends HTMLElement {
  // Define observed attributes for the component
  static get observedAttributes() {
    return ['name', 'size', 'label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.iconName = '';
    this.iconSize = '';
    this.iconCache = {};
    this.baseUrl = 'https://unpkg.com/@mui/icons-material/';
    this.iconNameMap = new Map(); // For mapping icon name variations
    this.initIconNameMap();
  }

  connectedCallback() {
    this.updateIcon();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    if (name === 'name') {
      this.iconName = newValue;
    } else if (name === 'size') {
      this.iconSize = newValue;
    }
    
    this.updateIcon();
  }

  async updateIcon() {
    if (!this.iconName) {
      console.warn('Icon name is required');
      return;
    }

    try {
      console.log(`Attempting to load icon: ${this.iconName}`);
      const iconSvg = await this.getIconSvg(this.iconName);
      
      if (!iconSvg) {
        console.warn(`Icon "${this.iconName}" not found`);
        // Add diagnostic info to help troubleshooting
        const formattedName = this.formatIconName(this.iconName);
        const mappedName = this.iconNameMap.has(this.iconName) ? 
          this.iconNameMap.get(this.iconName) : 'not mapped';
        console.info(`Diagnostic info - formattedName: ${formattedName}, mappedName: ${mappedName}`);
        
        this.shadowRoot.innerHTML = '';
        return;
      }

      // Define the CSS including cascade layers for organization
      const styles = `
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
            display: inline-grid;
            line-height: 1;
            vertical-align: middle;
            color: var(--icon-color);
          }

          .icon-wrapper {
            display: inline-grid;
            place-items: center;
          }

          svg {
            inline-size: 1.5cap;
            block-size: 1.5cap;
            fill: currentColor;
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
        }
      `;

      // Get the label for the icon (for better accessibility)
      const iconLabel = this.getAttribute('label') || this.iconName || 'icon';
      
      // Set aria-label only if explicitly provided, otherwise keep icon as decorative
      const ariaAttrs = this.hasAttribute('label') 
        ? `role="img" aria-label="${iconLabel}"` 
        : `role="img" aria-hidden="true"`;

      this.shadowRoot.innerHTML = `
        <style>${styles}</style>
        <span class="icon-wrapper" ${ariaAttrs}>
          ${iconSvg}
        </span>
      `;
      
      console.log(`Successfully loaded icon: ${this.iconName}`);
    } catch (error) {
      console.error(`Error loading icon "${this.iconName}": ${error.message}`);
      this.shadowRoot.innerHTML = '';
    }
  }

  async getIconSvg(name) {
    // First check if we've already cached this icon
    if (this.iconCache[name]) {
      return this.iconCache[name];
    }
    
    try {
      // Check if icon exists in our local fallback
      const fallbackIcon = this.getFallbackIcon(name);
      if (fallbackIcon) {
        this.iconCache[name] = fallbackIcon;
        return fallbackIcon;
      }
      
      // Format the icon name for MUI's naming convention
      let formattedName = this.formatIconName(name);
      
      // Try to use a known mapping if available
      if (this.iconNameMap.has(name)) {
        formattedName = this.iconNameMap.get(name);
      }
      
      // Array of possible paths to try
      const pathFormats = [
        // Standard ESM path
        `${this.baseUrl}esm/${formattedName}.js`,
        // Without "Icon" suffix
        `${this.baseUrl}esm/${formattedName.replace('Icon', '')}.js`,
        // Lib path
        `${this.baseUrl}lib/${formattedName}/index.js`,
        // Try with "Outlined" suffix
        `${this.baseUrl}esm/${formattedName.replace('Icon', 'OutlinedIcon')}.js`,
        // Try with "Rounded" suffix
        `${this.baseUrl}esm/${formattedName.replace('Icon', 'RoundedIcon')}.js`,
        // Try with "Sharp" suffix
        `${this.baseUrl}esm/${formattedName.replace('Icon', 'SharpIcon')}.js`,
        // Try with "TwoTone" suffix
        `${this.baseUrl}esm/${formattedName.replace('Icon', 'TwoToneIcon')}.js`,
        // Try with lowercase first letter
        `${this.baseUrl}esm/${formattedName.charAt(0).toLowerCase() + formattedName.slice(1)}.js`
      ];
      
      // Try each path until one succeeds
      let response = null;
      let jsContent = null;
      
      for (const path of pathFormats) {
        try {
          const fetchResponse = await fetch(path);
          if (fetchResponse.ok) {
            response = fetchResponse;
            break;
          }
        } catch (e) {
          // Continue to next path
        }
      }
      
      // If no successful path was found
      if (!response || !response.ok) {
        throw new Error(`Icon "${name}" not found in MUI icons package`);
      }
      
      jsContent = await response.text();
      const svgContent = this.extractSvgFromJs(jsContent);
      
      if (!svgContent) {
        throw new Error(`Could not extract SVG content for icon "${name}"`);
      }
      
      this.iconCache[name] = svgContent;
      return svgContent;
    } catch (error) {
      console.error(`Failed to load icon "${name}": ${error.message}`);
      return null;
    }
  }

  extractSvgFromJs(jsContent) {
    // Try multiple approaches to extract SVG content
    
    // Approach 1: Extract path data directly
    let pathMatch = jsContent.match(/d:\s*["']([^"']+)["']/);
    
    if (pathMatch) {
      const pathData = pathMatch[1];
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="${pathData}"/>
      </svg>`;
    }
    
    // Approach 2: Extract a complete SVG string
    const svgMatch = jsContent.match(/<svg[^>]*>(.*?)<\/svg>/s);
    
    if (svgMatch) {
      return svgMatch[0];
    }
    
    // Approach 3: Parse React.createElement format (standard in MUI)
    const pathElements = jsContent.match(/React\.createElement\("path",[^)]*\{[^}]*d:\s*"([^"]+)"[^}]*\}[^)]*\)/g);
    
    if (pathElements && pathElements.length > 0) {
      const pathData = pathElements.map(pe => {
        const match = pe.match(/d:\s*"([^"]+)"/);
        return match ? `<path d="${match[1]}"/>` : '';
      }).join('');
      
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${pathData}</svg>`;
    }
    
    // Approach 4: Try to find specific MUI patterns
    // Look for array of path data in createSvgIcon format
    const createSvgIconMatch = jsContent.match(/createSvgIcon\(\s*_[\w]+\.jsx\(\s*"([^"]+)"/);
    if (createSvgIconMatch) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="${createSvgIconMatch[1]}"/>
      </svg>`;
    }
    
    // Approach 5: Handle array of paths in CommonJS format
    const commonJsPathMatch = jsContent.match(/module\.exports\s*=\s*\{\s*"d"\s*:\s*"([^"]+)"/);
    if (commonJsPathMatch) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="${commonJsPathMatch[1]}"/>
      </svg>`;
    }
    
    // Approach 6: Find any d="..." pattern to get the path data
    const genericPathMatch = jsContent.match(/d=["']([^"']+)["']/);
    if (genericPathMatch) {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="${genericPathMatch[1]}"/>
      </svg>`;
    }
    
    // If all approaches fail, return null
    return null;
  }

  formatIconName(name) {
    // Convert kebab-case to PascalCase and add "Icon" suffix
    return name
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'Icon';
  }

  // Initialize the icon name mapping for special cases
  initIconNameMap() {
    // Some MUI icons have naming variations
    const mappings = [
      ['shopping-cart', 'ShoppingCartIcon'],
      ['home', 'HomeIcon'],
      ['check', 'CheckIcon'],
      ['close', 'CloseIcon'],
      ['arrow-back', 'ArrowBackIcon'],
      ['arrow-forward', 'ArrowForwardIcon'],
      ['menu', 'MenuIcon'],
      ['search', 'SearchIcon'],
      ['settings', 'SettingsIcon'],
      ['account-circle', 'AccountCircleIcon'],
      ['favorite', 'FavoriteIcon'],
      ['star', 'StarIcon'],
      ['delete', 'DeleteIcon'],
      ['edit', 'EditIcon'],
      ['save', 'SaveIcon'],
      ['email', 'EmailIcon'],
      ['notifications', 'NotificationsIcon'],
      ['local-shipping', 'LocalShippingIcon'],
      ['payment', 'PaymentIcon'],
      ['receipt', 'ReceiptIcon'],
      ['more-vert', 'MoreVertIcon'],
      ['more-horiz', 'MoreHorizIcon'],
      ['done', 'DoneIcon'],
      ['add', 'AddIcon'],
      ['remove', 'RemoveIcon'],
      ['info', 'InfoIcon'],
      ['warning', 'WarningIcon'],
      ['error', 'ErrorIcon'],
      ['help', 'HelpIcon'],
      ['phone', 'PhoneIcon'],
      ['message', 'MessageIcon'],
      ['chat', 'ChatIcon'],
      ['lock', 'LockIcon'],
      ['lock-open', 'LockOpenIcon'],
      ['person', 'PersonIcon'],
      ['people', 'PeopleIcon'],
      ['location-on', 'LocationOnIcon'],
      ['share', 'ShareIcon'],
      ['file-copy', 'FileCopyIcon'],
      ['folder', 'FolderIcon'],
      ['attach-file', 'AttachFileIcon'],
      ['link', 'LinkIcon'],
      ['print', 'PrintIcon'],
      ['download', 'DownloadIcon'],
      ['upload', 'UploadIcon'],
      ['dashboard', 'DashboardIcon'],
      ['calendar-today', 'CalendarTodayIcon'],
      ['event', 'EventIcon'],
      ['access-time', 'AccessTimeIcon'],
      ['alarm', 'AlarmIcon'],
      ['visibility', 'VisibilityIcon'],
      ['visibility-off', 'VisibilityOffIcon'],
      ['expand-more', 'ExpandMoreIcon'],
      ['expand-less', 'ExpandLessIcon'],
      ['refresh', 'RefreshIcon'],
      ['clear', 'ClearIcon'],
      ['send', 'SendIcon']
    ];
    
    for (const [key, value] of mappings) {
      this.iconNameMap.set(key, value);
    }
  }

  // Fallback icons for common ones to avoid network requests
  getFallbackIcon(name) {
    const icons = {
      'accessibility': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
      </svg>`,
      'add': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>`,
      'arrow-back': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
      </svg>`,
      'arrow-forward': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
      </svg>`,
      'menu': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
      </svg>`,
      'close': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>`,
      'search': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>`,
      'favorite': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>`,
      'delete': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>`,
      'home': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>`,
      'shopping-cart': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>`,
      'settings': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
      </svg>`,
      'account-circle': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
      </svg>`,
      'person': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>`,
      'email': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
      </svg>`,
      'phone': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
      </svg>`,
      'message': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
      </svg>`,
      'notifications': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
      </svg>`,
      'star': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>`,
      'remove': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M19 13H5v-2h14v2z"/>
      </svg>`,
      'edit': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>`,
      'save': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
      </svg>`,
      'share': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
      </svg>`,
      'check': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>`,
      'clear': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>`,
      'download': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/>
      </svg>`,
      'upload': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
      </svg>`,
      'expand-more': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"/>
      </svg>`,
      'expand-less': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z"/>
      </svg>`,
      'more-vert': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>`,
      'more-horiz': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>`,
      'refresh': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
      </svg>`,
      'location-on': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>`,
      'calendar-today': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/>
      </svg>`,
      'event': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
      </svg>`,
      'access-time': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
        <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
      </svg>`,
      'alarm': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M22 5.72l-4.6-3.86-1.29 1.53 4.6 3.86L22 5.72zM7.88 3.39L6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM12.5 8H11v6l4.75 2.85.75-1.23-4-2.37V8zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
      </svg>`,
      'visibility': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg>`,
      'visibility-off': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
      </svg>`,
      'lock': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
      </svg>`,
      'lock-open': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/>
      </svg>`,
      'info': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>`,
      'warning': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
      </svg>`,
      'error': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>`,
      'help': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
      </svg>`,
      'file-copy': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm-1 4l6 6v10c0 1.1-.9 2-2 2H7.99C6.89 23 6 22.1 6 21l.01-14c0-1.1.89-2 1.99-2h7zm-1 7h5.5L14 6.5V12z"/>
      </svg>`,
      'folder': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>`,
      'attach-file': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
      </svg>`,
      'link': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
      </svg>`,
      'print': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
      </svg>`,
      'send': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
      </svg>`
    };

    return icons[name] || null;
  }
}

// Register the custom element
customElements.define('mui-icon', MuiIcon); 