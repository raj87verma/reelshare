/**
 * Copies non-TypeScript assets that the Electron main process needs at
 * runtime (currently just preload.js) from electron/ into dist/electron/.
 *
 * `tsc` only compiles .ts files, so anything else referenced by compiled
 * output (e.g. `preload: path.join(__dirname, 'preload.js')` in main.ts)
 * must be copied here explicitly as part of the build.
 */
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'electron');
const destDir = path.join(projectRoot, 'dist', 'electron');

const filesToCopy = ['preload.js'];

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

for (const file of filesToCopy) {
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);

  if (!fs.existsSync(src)) {
    console.error(`copy-electron-assets: expected file not found: ${src}`);
    process.exit(1);
  }

  fs.copyFileSync(src, dest);
  console.log(`copy-electron-assets: copied ${file} -> ${path.relative(projectRoot, dest)}`);
}
