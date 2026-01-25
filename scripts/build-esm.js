#!/usr/bin/env node
/**
 * Build ESM wrapper modules from CommonJS dist output.
 *
 * This script renames .js to .cjs and creates .mjs wrappers.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

// Rename main .js to .cjs and create .mjs wrapper
function createMainWrapper() {
  const jsPath = path.join(distDir, 'index.js');
  const cjsPath = path.join(distDir, 'index.cjs');

  // Rename .js to .cjs for explicit CommonJS
  if (fs.existsSync(jsPath)) {
    fs.renameSync(jsPath, cjsPath);
    console.log('Renamed dist/index.js -> dist/index.cjs');
  }

  // Create ESM wrapper that re-exports from .cjs
  const wrapper = `// ESM wrapper - re-export all from CommonJS
export * from './index.cjs';
`;

  fs.writeFileSync(path.join(distDir, 'index.mjs'), wrapper);
  console.log('Created dist/index.mjs');

  // Also create index.js as a CJS copy for backwards compatibility
  fs.copyFileSync(cjsPath, jsPath);
  console.log('Copied dist/index.cjs -> dist/index.js');
}

// Create ESM wrappers for proxy modules
function createProxyWrappers() {
  const proxyDir = path.join(distDir, 'proxy');
  if (!fs.existsSync(proxyDir)) {
    fs.mkdirSync(proxyDir, { recursive: true });
  }

  const jsFiles = fs.readdirSync(proxyDir).filter(f => f.endsWith('.js') && !f.endsWith('.cjs'));

  for (const jsFile of jsFiles) {
    const name = path.basename(jsFile, '.js');
    const cjsFile = `${name}.cjs`;
    const mjsFile = `${name}.mjs`;

    // Rename .js to .cjs
    const jsPath = path.join(proxyDir, jsFile);
    const cjsPath = path.join(proxyDir, cjsFile);
    fs.renameSync(jsPath, cjsPath);

    // Create .mjs wrapper
    const wrapper = `// ESM wrapper - re-export all from CommonJS
export * from './${cjsFile}';
`;

    fs.writeFileSync(path.join(proxyDir, mjsFile), wrapper);

    // Copy back for backwards compatibility
    fs.copyFileSync(cjsPath, jsPath);

    console.log(`Created dist/proxy/${mjsFile}`);
  }
}

// Run
createMainWrapper();
createProxyWrappers();
console.log('ESM build complete');
