const fs = require('fs');
const path = require('path');

// Helper to convert camelCase/PascalCase to kebab-case
function toKebabCase(str) {
  // If the key is numeric (like "0", "1"), return it as is
  if (/^\d+$/.test(str)) {
    return str;
  }
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

// Ignore metadata keys
const METADATA_KEYS = new Set(['description', 'usage', '$description', '$type']);

function run() {
  console.log('Starting Design Tokens to CSS variables conversion...');

  const colorTokensPath = path.join(__dirname, 'color-tokens.json');
  const designTokensPath = path.join(__dirname, 'design-tokens.tokens');
  const outputPath = path.join(__dirname, 'variables.css');

  if (!fs.existsSync(colorTokensPath)) {
    console.error(`Error: color-tokens.json not found at ${colorTokensPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(designTokensPath)) {
    console.error(`Error: design-tokens.tokens not found at ${designTokensPath}`);
    process.exit(1);
  }

  // Load and parse
  const colorTokens = JSON.parse(fs.readFileSync(colorTokensPath, 'utf8'));
  const designTokens = JSON.parse(fs.readFileSync(designTokensPath, 'utf8'));

  const cssVariables = [];

  // --- 1. Process Color Tokens ---
  cssVariables.push('  /* ========================================================================== */');
  cssVariables.push('  /* COLOR SYSTEM                                                               */');
  cssVariables.push('  /* ========================================================================== */\n');

  // Extract brand (primitive) colors dynamically to map roles to primitives
  const brandMap = {};
  const primitiveColors = [];
  const brandColorsNode = colorTokens.futfi8?.color?.brand;

  if (brandColorsNode) {
    primitiveColors.push('  /* --- Color Primitives (Brand Primitives - DO NOT use directly in UI) --- */');
    for (const [key, token] of Object.entries(brandColorsNode)) {
      if (METADATA_KEYS.has(key)) continue;
      const val = typeof token === 'object' && token !== null ? token.value : token;
      if (val) {
        const kebabKey = toKebabCase(key);
        const varName = `--futfi8-color-brand-${kebabKey}`;
        primitiveColors.push(`  ${varName}: ${val};`);
        brandMap[val.toLowerCase()] = `var(${varName})`;
      }
    }
    primitiveColors.push('');
  }

  // Crawl color roles and convert
  const colorRoles = [];
  colorRoles.push('  /* --- Color Roles (UI elements MUST use these semantic variables) --- */');

  const colorNode = colorTokens.futfi8?.color;
  if (colorNode) {
    for (const [groupName, groupNode] of Object.entries(colorNode)) {
      if (groupName === 'brand' || METADATA_KEYS.has(groupName)) continue;

      // Recursive function to gather variables from this group
      function parseColorGroup(node, pathParts) {
        if (typeof node !== 'object' || node === null) {
          // Leaf node as a direct string/number
          const val = node.toString();
          const cleanVal = val.toLowerCase();
          const mappedValue = brandMap[cleanVal] || val;
          const varName = `--futfi8-color-${pathParts.map(toKebabCase).join('-')}`;
          colorRoles.push(`  ${varName}: ${mappedValue};`);
          return;
        }

        if ('value' in node) {
          // Leaf node with a 'value' property
          const val = node.value.toString();
          const cleanVal = val.toLowerCase();
          const mappedValue = brandMap[cleanVal] || val;
          const varName = `--futfi8-color-${pathParts.map(toKebabCase).join('-')}`;
          colorRoles.push(`  ${varName}: ${mappedValue};`);
          return;
        }

        // Object group
        for (const [key, child] of Object.entries(node)) {
          if (METADATA_KEYS.has(key)) continue;
          parseColorGroup(child, [...pathParts, key]);
        }
      }

      parseColorGroup(groupNode, [groupName]);
    }
  }
  colorRoles.push('');

  // Add primitive and role color variables to output
  cssVariables.push(...primitiveColors);
  cssVariables.push(...colorRoles);

  // Parse color-tokens.json's typography if it's there
  if (colorTokens.futfi8?.typography) {
    cssVariables.push('  /* --- Legacy/Semantic Typography Presets (from color tokens) --- */');
    for (const [styleName, styleNode] of Object.entries(colorTokens.futfi8.typography)) {
      if (METADATA_KEYS.has(styleName)) continue;
      for (const [propName, propVal] of Object.entries(styleNode)) {
        if (METADATA_KEYS.has(propName)) continue;
        const varName = `--futfi8-legacy-typography-${toKebabCase(styleName)}-${toKebabCase(propName)}`;
        cssVariables.push(`  ${varName}: ${propVal};`);
      }
    }
    cssVariables.push('');
  }

  // --- 2. Process Design Tokens (W3C Format) ---
  // Helper to crawl W3C tokens
  function crawlW3CTokens(node, pathParts, categoryMap) {
    if (typeof node !== 'object' || node === null) return;

    if ('$value' in node) {
      // It's a token!
      const val = node.$value;
      const kebabPath = pathParts.map(toKebabCase).join('-');
      categoryMap.push({
        path: kebabPath,
        rawPath: pathParts.join('.'),
        value: val,
      });
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (METADATA_KEYS.has(key)) continue;
      crawlW3CTokens(child, [...pathParts, key], categoryMap);
    }
  }

  // Crawl all design token sets
  const designTokenCategories = [
    { name: 'typography', label: 'TYPOGRAPHY' },
    { name: 'spacing', label: 'SPACING SYSTEM (4px base)' },
    { name: 'borderRadius', label: 'BORDER RADIUS SYSTEM' },
    { name: 'elevation', label: 'ELEVATION SYSTEM (Lightness-based)' },
    { name: 'motion', label: 'MOTION & TRANSITIONS' },
    { name: 'breakpoints', label: 'RESPONSIVE BREAKPOINTS' }
  ];

  for (const cat of designTokenCategories) {
    const node = designTokens[cat.name];
    if (!node) continue;

    cssVariables.push(`  /* ========================================================================== */`);
    cssVariables.push(`  /* ${cat.label.padEnd(76, ' ')} */`);
    cssVariables.push(`  /* ========================================================================== */\n`);

    const tokens = [];
    crawlW3CTokens(node, [cat.name], tokens);

    // Resolve W3C references (e.g., {typography.fontFamily.display})
    for (const token of tokens) {
      let finalVal = token.value;
      if (typeof finalVal === 'string' && finalVal.startsWith('{') && finalVal.endsWith('}')) {
        const refPath = finalVal.slice(1, -1);
        const refKebab = refPath.split('.').map(toKebabCase).join('-');
        finalVal = `var(--futfi8-${refKebab})`;
      }
      cssVariables.push(`  --futfi8-${token.path}: ${finalVal};`);
    }
    cssVariables.push('');
  }

  // Generate output content
  const cssContent = `/**
 * FUTFI8 DESIGN SYSTEM VARIABLES
 * Auto-generated from color-tokens.json and design-tokens.tokens.
 * Do not modify directly.
 * 
 * IMPORTANT:
 * - UI components MUST only use semantic color roles (e.g., --futfi8-color-text-primary, --futfi8-color-background-surface).
 * - Primitive colors (--futfi8-color-brand-*) are for internal configuration and mapping only.
 */

:root {
${cssVariables.join('\n')}
}
`;

  fs.writeFileSync(outputPath, cssContent, 'utf8');
  console.log(`Successfully compiled design tokens to ${outputPath}!`);
}

run();
