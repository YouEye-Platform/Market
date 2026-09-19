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

test('catalog latestVersion values match their app manifests', () => {
  const problems = [];
  for (const id of pathEntries) {
    const manifest = readFileSync(join(appsDir, id, 'youeye-app.yaml'), 'utf8');
    const manifestVersion = manifest.match(/^version:\s*["']?([^"'\s]+)["']?\s*$/m)?.[1];
    const catalogVersion = catalog.match(
      new RegExp(`^  - id: ${id}\\n(?:^    .*\\n)*?^    latestVersion: ["']?([^"'\\s]+)["']?\\s*$`, 'm'),
    )?.[1];
    if (!manifestVersion) problems.push(`${id}: manifest version missing`);
    else if (!catalogVersion) problems.push(`${id}: catalog latestVersion missing`);
    else if (catalogVersion !== manifestVersion) {
      problems.push(`${id}: catalog ${catalogVersion} != manifest ${manifestVersion}`);
    }
  }
  assert.deepEqual(problems, [], problems.join('; '));
});

function parseConfigStorage(text) {
  const containers = new Map();
  let logicalContainer = null;
  let volume = null;
  let inContainers = false;
  let inVolumes = false;
  let inConfigFiles = false;
  let configFile = null;
  const configFiles = [];

  const finishConfigFile = () => {
    if (configFile) configFiles.push(configFile);
    configFile = null;
  };

  for (const line of text.split('\n')) {
    if (/^containers:\s*$/.test(line)) {
      inContainers = true;
      inConfigFiles = false;
      continue;
    }
    if (/^configFiles:\s*$/.test(line)) {
      finishConfigFile();
      inContainers = false;
      inVolumes = false;
      inConfigFiles = true;
      continue;
    }
    if (/^[a-zA-Z]/.test(line) && !/^containers:|^configFiles:/.test(line)) {
      finishConfigFile();
      inContainers = false;
      inVolumes = false;
      inConfigFiles = false;
    }

    if (inContainers) {
      const container = line.match(/^  - name:\s*["']?([a-z0-9-]+)["']?\s*$/)?.[1];
      if (container) {
        logicalContainer = container;
        containers.set(container, []);
        volume = null;
        inVolumes = false;
        continue;
      }
      if (/^    volumes:\s*$/.test(line)) {
        inVolumes = true;
        continue;
      }
      const volumeName = inVolumes && line.match(/^      - name:\s*["']?([a-z0-9-]+)["']?\s*$/)?.[1];
      if (volumeName && logicalContainer) {
        volume = { name: volumeName };
        containers.get(logicalContainer).push(volume);
        continue;
      }
      const mount = inVolumes && line.match(/^        container:\s*["']?([^"']+)["']?\s*$/)?.[1];
      if (mount && volume) volume.path = mount;
      const type = inVolumes && line.match(/^        type:\s*([a-z]+)\s*$/)?.[1];
      if (type && volume) volume.type = type;
    }

    if (inConfigFiles) {
      const firstField = line.match(/^  - (container|path):\s*["']?([^"']+)["']?\s*$/);
      if (firstField) {
        finishConfigFile();
        configFile = { [firstField[1]]: firstField[2] };
        continue;
      }
      const field = line.match(/^    (container|path):\s*["']?([^"']+)["']?\s*$/);
      if (field && configFile) configFile[field[1]] = field[2];
    }
  }
  finishConfigFile();
  return { containers, configFiles };
}

test('generated config files target declared container storage', () => {
  const problems = [];
  for (const id of appFolders) {
    const text = readFileSync(join(appsDir, id, 'youeye-app.yaml'), 'utf8');
    if (!/^configFiles:\s*$/m.test(text)) continue;
    const { containers, configFiles } = parseConfigStorage(text);
    if (configFiles.length === 0) problems.push(`${id}: configFiles has no entries`);
    for (const configFile of configFiles) {
      const volumes = containers.get(configFile.container);
      if (!volumes) {
        problems.push(`${id}: config file targets unknown container ${configFile.container}`);
        continue;
      }
      if (!configFile.path?.startsWith('/')) {
        problems.push(`${id}: config file path is not absolute`);
        continue;
      }
      if (configFile.path.startsWith('/var/lib/youeye/app-')) {
        problems.push(`${id}: config file uses legacy host path ${configFile.path}`);
      }
      const volume = volumes.find(({ path: mount }) =>
        configFile.path === mount || configFile.path.startsWith(`${mount?.replace(/\/$/, '')}/`),
      );
      if (!volume) {
        problems.push(`${id}: ${configFile.container}:${configFile.path} is outside ${volumes.map(({ path }) => path).join(', ')}`);
      } else if (volume.type === 'cache') {
        problems.push(`${id}: config file targets unprovisioned cache volume ${volume.name}`);
      }
    }
    if (/^\s+host:\s*["']?\/var\/lib\/youeye\/app-/m.test(text)) {
      problems.push(`${id}: config-bearing manifest retains a legacy volume host path`);
    }
  }
  assert.deepEqual(problems, [], problems.join('; '));
});

test('native app repos use the source provider identities and pinned manifest destinations', () => {
  const expected = new Map([
    ['wiki', 'YouEye-Platform/Wiki'],
    ['search', 'YouEye-Platform/Search'],
    ['notes', 'YouEye-Platform/Notes'],
    ['cinema', 'YouEye-Platform/Cinema'],
    ['weather', 'YouEye-Platform/Weather'],
    ['translate', 'YouEye-Platform/Translate'],
  ]);
  const entries = new Map();
  let inApps = false;
  let current = null;
  for (const line of catalog.split('\n')) {
    if (/^apps:\s*$/.test(line)) { inApps = true; continue; }
    if (inApps && /^[a-zA-Z]/.test(line)) break;
    if (!inApps) continue;
    const id = line.match(/^  - id:\s*([a-z0-9-]+)\s*$/)?.[1];
    if (id) { if (current) entries.set(current.id, current); current = { id }; continue; }
    const field = line.match(/^    (repo|branch|manifest|integration):\s*([^\s]+)\s*$/);
    if (field && current) current[field[1]] = field[2];
  }
  if (current) entries.set(current.id, current);
  const problems = [];
  for (const [id, repo] of expected) {
    const entry = entries.get(id) ?? {};
    if (entry.repo !== repo) problems.push(`${id}: repo is ${entry.repo || 'missing'}, expected ${repo}`);
    if (entry.branch !== 'main') problems.push(`${id}: branch is ${entry.branch || 'missing'}, expected main`);
    if (entry.manifest !== 'youeye-app.yaml') problems.push(`${id}: manifest is ${entry.manifest || 'missing'}, expected youeye-app.yaml`);
    if (entry.integration !== 'native') problems.push(`${id}: integration is ${entry.integration || 'missing'}, expected native`);
  }
  assert.deepEqual(problems, [], problems.join('; '));
});
