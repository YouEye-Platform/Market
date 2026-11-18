// The Market is published as static files built by the generator in the YouEye repository
// (control-panel/scripts/market-build.ts). These tests run it on this catalog: from the YouEye
// checkout named by YOUEYE_ROOT, else ../YouEye beside this repository.
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const youeye = process.env.YOUEYE_ROOT || resolve(root, '..', 'YouEye');
const controlPanel = join(youeye, 'control-panel');
const available = existsSync(join(controlPanel, 'scripts', 'market-build.ts')) && existsSync(join(controlPanel, 'node_modules'));
const skip = available ? false : `no YouEye checkout with control-panel/node_modules at ${youeye} (set YOUEYE_ROOT)`;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function scratch(t, prefix) {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}

/** A copy of this repository without .git, node_modules or out/. */
function copy(t) {
  const directory = scratch(t, 'market-copy-');
  cpSync(root, directory, { recursive: true, filter: (path) => !path.slice(root.length).split('/').some((part) => ['.git', 'node_modules', 'out'].includes(part)) });
  return directory;
}

function build(repo, out) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'scripts/market-build.ts', repo, '--out', out, '--commit', '0123abcd', '--sequence', '1795000000'],
    { cwd: controlPanel, encoding: 'utf8' });
}

/** Every file under `directory`, relative, sorted. */
function tree(directory, prefix = '') {
  return readdirSync(join(directory, prefix)).sort().flatMap((name) => {
    const rel = prefix ? `${prefix}/${name}` : name;
    return statSync(join(directory, rel)).isDirectory() ? tree(directory, rel) : [rel];
  });
}

const apps = readdirSync(join(root, 'apps')).filter((entry) => statSync(join(root, 'apps', entry)).isDirectory()).sort();

test('the catalog builds into a market the format accepts, twice byte for byte', { skip }, (t) => {
  const [first, second] = [scratch(t, 'market-out-'), scratch(t, 'market-out-')];
  for (const out of [first, second]) {
    const result = build(root, out);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
  const files = tree(first);
  assert.deepEqual(tree(second), files);
  for (const file of files) assert.ok(readFileSync(join(first, file)).equals(readFileSync(join(second, file))), file);

  const pointer = JSON.parse(readFileSync(join(first, 'market.json'), 'utf8'));
  assert.deepEqual([pointer.schema, pointer.name, pointer.publisher, pointer.homepage, pointer.commit, pointer.sequence],
    ['youeye.market.v1', 'YouEye Market', 'YouEye', 'https://market.youeye.me', '0123abcd', 1795000000]);
  const indexBytes = readFileSync(join(first, pointer.index.path));
  assert.equal(sha256(indexBytes), pointer.index.sha256);
  const index = JSON.parse(indexBytes);
  assert.deepEqual(index.apps.map((app) => app.id), apps);
  assert.deepEqual(index.native, ['notes', 'wiki', 'search', 'translate', 'weather', 'cinema']);
  assert.deepEqual(index.bundles.map((bundle) => bundle.id), readdirSync(join(root, 'bundles')).sort());
  for (const app of index.apps) {
    const bundle = JSON.parse(readFileSync(join(first, app.bundle.path), 'utf8'));
    assert.equal(bundle.manifest, readFileSync(join(root, 'apps', app.id, 'youeye-app.yaml'), 'utf8'), app.id);
    for (const [name, file] of Object.entries(bundle.files)) {
      assert.equal(sha256(readFileSync(join(first, file))), sha256(readFileSync(join(root, 'apps', app.id, name))), `${app.id}/${name}`);
    }
    assert.ok(app.icon && Object.values(bundle.files).includes(app.icon), `${app.id} has its icon`);
  }
  // Licence and notice files are published unchanged beside the market.
  for (const id of apps) {
    for (const name of readdirSync(join(root, 'apps', id)).filter((name) => /^(ASSET-NOTICES|LICENSE|COPYING)/.test(name))) {
      assert.ok(readFileSync(join(first, 'notices', id, name)).equals(readFileSync(join(root, 'apps', id, name))), `${id}/${name}`);
    }
  }
  assert.ok(!files.some((file) => /^(apps|bundles|system|drafts|tests)\//.test(file)), 'only the market, never the repository');
});

test('the generator refuses a broken catalog and names every problem', { skip }, (t) => {
  const repo = copy(t);
  const edit = (path, change) => writeFileSync(join(repo, path), change(readFileSync(join(repo, path), 'utf8')));
  edit('apps/mealie/youeye-app.yaml', (text) => text.replace('id: mealie', 'id: other'));
  edit('apps/memos/youeye-app.yaml', (text) => text.replace(/@sha256:[0-9a-f]{64}/, ':latest'));
  edit('apps/sonarr/youeye-app.yaml', (text) => text.replace('setup/connect-prowlarr.yaml', 'setup/connect-missing.yaml'));
  edit('apps/gramps-web/youeye-app.yaml', (text) => text.replace(/^requires:.*\n/m, ''));
  edit('bundles/private-search/bundle.yaml', (text) => text.replace('id: private-search', 'id: other'));
  edit('catalog.yaml', (text) => text.replace('native: [notes,', 'native: [jellyfin, notes,').replace('apps: [searxng, wikiless]', 'apps: [searxng, nowhere]'));
  edit('asset-provenance.json', (text) => {
    const provenance = JSON.parse(text);
    provenance.assets = provenance.assets.filter((asset) => asset.path !== 'apps/immich/icon.svg');
    provenance.assets.find((asset) => asset.path.startsWith('apps/jellyfin/')).sha256 = `sha256:${'0'.repeat(64)}`;
    return JSON.stringify(provenance, null, 2);
  });
  const out = scratch(t, 'market-out-');
  const result = build(repo, out);
  assert.equal(result.status, 1, result.stdout);
  for (const pattern of [
    /apps\/mealie: id is "other"; it must equal the folder name/,
    /apps\/memos: .*image must be pinned by digest/,
    /apps\/sonarr: .*setup\/connect-missing\.yaml does not exist/,
    /apps\/gramps-web: youeye-app\.yaml: sidecars\[\]\.data\[\]\.from needs YouEye 0\.6\.9, but requires\.youeye is missing/,
    /bundles\/private-search\/bundle\.yaml: id is "other"/,
    /native app "jellyfin" also has an app folder/,
    /curation\.collections\.private-search names "nowhere"/,
    /apps\/immich\/icon\.svg: picture has no record in asset-provenance\.json/,
    /asset-provenance\.json: apps\/jellyfin\/.*: sha256 is stale/,
  ]) assert.match(result.stderr, pattern);
  assert.deepEqual(readdirSync(out), [], 'nothing is written');
});

test('npm run build needs YOUEYE_ROOT', (t) => {
  const repo = copy(t);
  const env = { ...process.env };
  delete env.YOUEYE_ROOT;
  const result = spawnSync('npm', ['run', '--silent', 'build'], { cwd: repo, encoding: 'utf8', env });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /set YOUEYE_ROOT to a YouEye checkout/);
});
