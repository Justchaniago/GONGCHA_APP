// Runtime loader shim: redirect `react-native` ESM entry (Flow syntax) to its CJS build.
// Registered via --import before the test module loads.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

// Find the CJS build of react-native (has no Flow-only `import typeof`).
const candidates = [
  'react-native/index.js',
  'react-native/Libraries/Renderer/shims/ReactNative.js',
];
let cjsPath = null;
for (const c of candidates) {
  try {
    const p = require.resolve(c);
    if (existsSync(p)) { cjsPath = p; break; }
  } catch {}
}
if (!cjsPath) {
  console.error('[rn-shim] could not resolve react-native CJS build');
  process.exit(1);
}

// Patch module resolution: any import of 'react-native' (bare specifier) → cjsPath.
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'react-native' || request.startsWith('react-native/')) {
    // resolve subpaths inside react-native normally EXCEPT the Flow entry
    const resolved = origResolve.call(this, request, parent, isMain, options);
    if (request === 'react-native' && resolved.endsWith('index.js')) {
      return cjsPath;
    }
    return resolved;
  }
  return origResolve.call(this, request, parent, isMain, options);
};

// ALSO: pre-emptively consume the Flow entry before esbuild transforms it —
// replace the `import typeof` line with a no-op comment in the loaded copy.
// (esbuild transforms on read; we patch the file that node's loader reads.)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
const idx = require.resolve('react-native/index.js');
const raw = readFileSync(idx, 'utf8');
if (raw.includes('import typeof')) {
  const patched = raw
    .replace(
      /import typeof \* as ReactNativePublicAPI from '\.\/index\.js\.flow';\n?/,
      '// [rn-shim] Flow-only import removed for headless test run\n',
    )
    .replace(
      /} as ReactNativePublicAPI;/,
      '};\n// [rn-shim] Flow-only cast removed for headless test run',
    )
    // relative requires inside the patched copy resolve against .rn-shim-cache/;
    // rewrite them to bare specifiers so node_modules lookup works
    .replace(
      /require\('\.\/Libraries\//g,
      "require('react-native/Libraries/",
    )
    .replace(
      /require\('\.\/src\//g,
      "require('react-native/src/",
    );
  const cacheDir = join(dirname(idx), '.rn-shim-cache');
  mkdirSync(cacheDir, { recursive: true });
  const patchedPath = join(cacheDir, 'index.js');
  writeFileSync(patchedPath, patched);
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request === 'react-native' || request.startsWith('react-native/')) {
      const resolved = origResolve.call(this, request, parent, isMain, options);
      if (request === 'react-native' && resolved.endsWith('index.js')) {
        return patchedPath;
      }
      return resolved;
    }
    return origResolve.call(this, request, parent, isMain, options);
  };
  console.log('[rn-shim] react-native patched →', patchedPath);
} else {
  console.log('[rn-shim] react-native →', cjsPath);
}
