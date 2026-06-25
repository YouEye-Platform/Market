// Structural guard for the new apps/<id>/ market layout. Dependency-free (node:test only).
// Run from the repo root: `pnpm test`  (or `node --test tests/*.spec.mjs`).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const appsDir = join(root, 'apps');
const catalog = readFileSync(join(root, 'catalog.yaml'), 'utf8');

const appFolders = readdirSync(appsDir).filter((e) => statSync(join(appsDir, e)).isDirectory());

// Catalog `path: apps/<id>` entries (the new layout).
const pathEntries = [...catalog.matchAll(/^\s*path:\s*apps\/([a-z0-9-]+)\s*$/gm)].map((m) => m[1]);

test('catalog and apps/ exist', () => {
  assert.match(catalog, /^kind:\s*catalog$/m, 'catalog.yaml must declare kind: catalog');
  assert.ok(appFolders.length > 0, 'apps/ must contain app folders');
});

test('every apps/<id>/ has a valid youeye-app.yaml with matching id', () => {
  const problems = [];
  for (const id of appFolders) {
    const manifestPath = join(appsDir, id, 'youeye-app.yaml');
    if (!existsSync(manifestPath)) { problems.push(`${id}: missing youeye-app.yaml`); continue; }
    const text = readFileSync(manifestPath, 'utf8');
    if (!/^\s*kind:\s*["']?app["']?\s*$/m.test(text)) problems.push(`${id}: not kind: app`);
    const idMatch = text.match(/^\s*id:\s*["']?([a-z0-9-]+)["']?\s*$/m);
    if (!idMatch) problems.push(`${id}: no metadata.id`);
    else if (idMatch[1] !== id) problems.push(`${id}: metadata.id="${idMatch[1]}" != folder`);
  }
  assert.deepEqual(problems, [], problems.join('; '));
});

test('co-located iconUrl points to an existing file; no legacy icons/ or external/ refs', () => {
  const problems = [];
  for (const id of appFolders) {
    const text = readFileSync(join(appsDir, id, 'youeye-app.yaml'), 'utf8');
    const icon = text.match(/^\s*iconUrl:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1];
    if (!icon) continue; // Lucide-only icon is fine
    if (icon.startsWith('http')) continue; // absolute URL is fine
    if (icon.startsWith('icons/') || icon.startsWith('external/'))
      problems.push(`${id}: legacy iconUrl "${icon}" (should be co-located)`);
    else if (!existsSync(join(appsDir, id, icon)))
      problems.push(`${id}: iconUrl "${icon}" file missing in apps/${id}/`);
  }
  assert.deepEqual(problems, [], problems.join('; '));
});

test('catalog has no legacy external/ or icons/ references', () => {
  const legacy = [...catalog.matchAll(/^.*\b(external|icons)\/.*$/gm)].map((m) => m[0].trim());
  assert.deepEqual(legacy, [], `legacy refs in catalog.yaml: ${legacy.join(' | ')}`);
});

test('catalog path: entries and apps/ folders are in sync (no orphans)', () => {
  const inCatalogNotOnDisk = pathEntries.filter((id) => !appFolders.includes(id));
  const onDiskNotInCatalog = appFolders.filter((id) => !pathEntries.includes(id));
  assert.deepEqual(inCatalogNotOnDisk, [], `catalog path: entries with no apps/ folder: ${inCatalogNotOnDisk.join(', ')}`);
  assert.deepEqual(onDiskNotInCatalog, [], `apps/ folders not referenced by a catalog path: entry: ${onDiskNotInCatalog.join(', ')}`);
});
