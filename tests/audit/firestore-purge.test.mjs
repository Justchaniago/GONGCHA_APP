import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target directory to audit
const targetDir = path.resolve(__dirname, '../../src/presentation');

/**
 * Recursively find all source files in a directory.
 */
function getFilesRecursively(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      getFilesRecursively(filePath, files);
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      files.push(filePath);
    }
  }
  return files;
}

test('Presentation Layer Purity Audit - Zero Legacy Firestore Coupling', () => {
  const files = getFilesRecursively(targetDir);

  // Assert that we found some presentation files to audit
  assert.ok(files.length > 0, `Expected to find presentation files in: ${targetDir}`);

  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(path.resolve(__dirname, '../..'), file);

    // Strict regex rules to forbid direct imports or uses of legacy firebase/firestore
    const hasReactNativeFirebase = /@react-native-firebase/.test(content);
    const hasFirebaseFirestore = /from\s+['"]firebase\/firestore['"]/.test(content);
    const hasDirectOnSnapshot = /\bonSnapshot\b/.test(content);

    if (hasReactNativeFirebase || hasFirebaseFirestore || hasDirectOnSnapshot) {
      violations.push({
        file: relativePath,
        hasReactNativeFirebase,
        hasFirebaseFirestore,
        hasDirectOnSnapshot,
      });
    }
  }

  // If there are any violations, format a detailed error report
  if (violations.length > 0) {
    const report = violations
      .map(
        (v) =>
          `  - ${v.file}:${
            v.hasReactNativeFirebase ? ' [@react-native-firebase import]' : ''
          }${v.hasFirebaseFirestore ? ' [firebase/firestore import]' : ''}${
            v.hasDirectOnSnapshot ? ' [direct onSnapshot usage]' : ''
          }`
      )
      .join('\n');

    assert.fail(
      `Audit Failed! Direct legacy Firestore coupling detected in the presentation layer:\n${report}\n\nAll presentation components must use local viewmodels, gateways, or clean repository boundaries. Direct database imports are strictly forbidden.`
    );
  }

  console.log(`[Presentation Audit] Successfully audited ${files.length} files. Zero legacy Firestore coupling detected!`);
});
