import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DEFAULT_CONTENT } from '../frontend/js/site-content.js';

const ROOT = path.resolve('.');
const FRONTEND = path.join(ROOT, 'frontend');

async function walkJs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'data') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walkJs(full));
    else if (/\.(?:js|mjs)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function collectAssetPaths(obj, out = new Set()) {
  if (typeof obj === 'string') {
    if (obj.startsWith('assets/')) out.add(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach(item => collectAssetPaths(item, out));
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(val => collectAssetPaths(val, out));
  }
  return out;
}

const jsFiles = await walkJs(ROOT);
for (const file of jsFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}

const assetPaths = collectAssetPaths(DEFAULT_CONTENT);
assetPaths.add('assets/images/embroidery-bg.jpg');
let checkedAssets = 0;
for (const rel of assetPaths) {
  const full = path.join(FRONTEND, rel);
  const info = await stat(full);
  if (!info.isFile() || info.size < 1024) {
    throw new Error(`Missing or invalid asset: ${rel}`);
  }
  checkedAssets += 1;
}

console.log(`check OK: ${jsFiles.length} JS/MJS files syntax-checked, ${checkedAssets} imported image assets verified.`);
