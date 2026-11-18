#!/usr/bin/env node
/**
 * Write catalog.json (youeye.catalog-index.v1) for reading this repository as a custom Market source.
 *
 *   node scripts/catalog-index.mjs           write catalog.json from the apps/, bundles/ and system/ folders
 *   node scripts/catalog-index.mjs --check   exit 1 if catalog.json is missing or out of date
 *
 * A custom source (a box's Market → Sources, a git repository read as raw files from a branch) cannot list
 * folders, so the Control Panel reads this index to find the app, bundle and system ids. The official Market
 * release does not use it: catalog.json is not a catalog-snapshot input, so it never changes release bytes.
 * Commit it only on test branches such as `andrew-test`; regenerate it whenever apps are added or removed there.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirs = (d, file) => existsSync(join(root, d))
  ? readdirSync(join(root, d)).filter(e => !e.startsWith('.') && existsSync(join(root, d, e, file))).sort()
  : [];
const system = existsSync(join(root, 'system'))
  ? readdirSync(join(root, 'system')).filter(e => e.endsWith('.yaml') && !e.startsWith('.')).map(e => e.slice(0, -5)).sort()
  : [];
const index = { schema: 'youeye.catalog-index.v1', apps: dirs('apps', 'youeye-app.yaml'), bundles: dirs('bundles', 'bundle.yaml'), system };
const text = JSON.stringify(index, null, 2) + '\n';
const path = join(root, 'catalog.json');
if (process.argv.includes('--check')) {
  const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (current !== text) { console.error('catalog.json is missing or out of date: run node scripts/catalog-index.mjs'); process.exit(1); }
  console.log('catalog.json is current');
} else {
  writeFileSync(path, text);
  console.log(`catalog.json: ${index.apps.length} apps, ${index.bundles.length} bundles, ${index.system.length} system`);
}
