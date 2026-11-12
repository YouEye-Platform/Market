import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_INPUTS,
  MARKET_IDENTITY,
  SNAPSHOT_API_VERSION,
  buildAssetInventory,
  buildCatalogTar,
  buildSnapshot,
  sha256,
  validate,
} from '../scripts/catalog-snapshot.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const catalogText = readFileSync(join(root, 'catalog.yaml'), 'utf8');
const inventory = JSON.parse(readFileSync(join(root, 'asset-inventory.json'), 'utf8'));
const assetProvenance = JSON.parse(readFileSync(join(root, 'asset-provenance.json'), 'utf8'));
const snapshot = buildSnapshot(root);

function validInput() {
  return {
    root,
    catalogText,
    inventory: structuredClone(inventory),
    assetProvenance: structuredClone(assetProvenance),
  };
}

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'market-snapshot-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  cpSync(root, directory, { recursive: true, filter: (path) => !path.split('/').some(p => ['.git', 'node_modules'].includes(p)) });
  return directory;
}

function cli(directory, ...args) {
  return spawnSync(process.execPath, ['scripts/catalog-snapshot.mjs', ...args], { cwd: directory, encoding: 'utf8' });
}

/** Minimal ustar reader: [{name, mode, uid, gid, mtime, type, uname, gname, data}]. */
function readTar(bytes) {
  const entries = [];
  for (let offset = 0; offset + 512 <= bytes.length;) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every(byte => byte === 0)) break;
    const text = (start, length) => header.subarray(start, start + length).toString('utf8').replace(/\0.*$/s, '');
    const number = (start, length) => parseInt(text(start, length).trim() || '0', 8);
    const prefix = text(345, 155);
    const size = number(124, 12);
    let checksum = 0;
    for (let index = 0; index < 512; index += 1) checksum += index >= 148 && index < 156 ? 0x20 : header[index];
    assert.equal(number(148, 8), checksum, 'tar header checksum');
    entries.push({
      name: (prefix ? `${prefix}/` : '') + text(0, 100), mode: number(100, 8), uid: number(108, 8), gid: number(116, 8),
      mtime: number(136, 12), type: text(156, 1), magic: text(257, 6), uname: text(265, 32), gname: text(297, 32),
      data: bytes.subarray(offset + 512, offset + 512 + size),
    });
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return entries;
}

test('the snapshot describes content only: no version, branch, repository or host', () => {
  assert.deepEqual(Object.keys(snapshot), ['apiVersion', 'identity', 'content', 'catalog']);
  assert.equal(snapshot.apiVersion, SNAPSHOT_API_VERSION);
  assert.equal(snapshot.identity, MARKET_IDENTITY);
  assert.equal(snapshot.content.canonicalInputs, CANONICAL_INPUTS);
  assert.deepEqual(buildSnapshot(root), snapshot);
  assert.equal(snapshot.content.sha256, sha256(`${JSON.stringify(snapshot.content.files, null, 2)}\n`));
  assert.equal(snapshot.catalog.sha256, snapshot.content.files.find(f => f.path === 'catalog.yaml').sha256);
  assert.doesNotMatch(JSON.stringify(snapshot), /"(?:version|provenance|releaseBranch|releaseTag|branch|repository)"/);
});

test('the snapshot lists the catalog, manifests, images and notices', () => {
  const paths = snapshot.content.files.map(f => f.path);
  assert.deepEqual(paths, [...paths].sort());
  for (const path of ['catalog.yaml', 'store.yaml', 'RETIRED.md', 'asset-inventory.json', 'asset-provenance.json',
    'apps/immich/youeye-app.yaml', 'apps/immich/icon.svg', 'system/caddy.yaml']) assert.ok(paths.includes(path), path);
  for (const asset of inventory.assets) assert.ok(paths.includes(asset.path), asset.path);
  assert.ok(paths.some(p => /^apps\/[^/]+\/ASSET-NOTICES\.md$/.test(p)));
  assert.ok(!paths.some(p => p.split('/').some(part => part.startsWith('.'))));
  assert.ok(!paths.some(p => p.startsWith('scripts/') || p.startsWith('tests/')));
});

test('the committed asset inventory and provenance are valid', () => {
  assert.deepEqual(inventory, buildAssetInventory(root));
  assert.deepEqual(validate(validInput()), []);
});

test('manifest, image and added or removed files change the content identity', (t) => {
  const directory = fixture(t);
  const path = join(directory, 'apps/immich/youeye-app.yaml');
  const original = readFileSync(path, 'utf8');
  for (const changed of [
    original.replace(/^version:.*$/m, 'version: "999.0.0"'),
    original.replace(/sha256:[a-f0-9]{64}/, `sha256:${'0'.repeat(64)}`),
  ]) {
    assert.notEqual(changed, original, 'fixture must change a real version or OCI digest');
    writeFileSync(path, changed);
    assert.notEqual(buildSnapshot(directory).content.sha256, snapshot.content.sha256);
  }
  writeFileSync(path, original);
  for (const input of snapshot.content.files.filter((_, index) => index % 7 === 0)) {
    const file = join(directory, input.path);
    const bytes = readFileSync(file);
    writeFileSync(file, Buffer.concat([bytes, Buffer.from('\n')]));
    assert.notEqual(buildSnapshot(directory).content.sha256, snapshot.content.sha256, input.path);
    writeFileSync(file, bytes);
  }
  for (const area of ['apps', 'bundles', 'integrations', 'system', 'updates']) {
    const added = join(directory, area, 'added-fixture.txt');
    mkdirSync(join(directory, area), { recursive: true });
    writeFileSync(added, 'fixture\n');
    assert.notEqual(buildSnapshot(directory).content.sha256, snapshot.content.sha256, area);
    rmSync(added);
  }
  assert.equal(buildSnapshot(directory).content.sha256, snapshot.content.sha256);
  rmSync(path);
  assert.notEqual(buildSnapshot(directory).content.sha256, snapshot.content.sha256);
  rmSync(join(directory, 'store.yaml'));
  assert.throws(() => buildSnapshot(directory), /Canonical catalog input is missing: store\.yaml/);
});

test('native entries name only the app id', () => {
  const native = catalogText.match(/^  - id: notes\n    integration: native\n/m);
  assert.ok(native, 'notes is an id-only native entry');
  for (const extra of ['repo: YouEye-Platform/Notes', 'branch: main', 'manifest: youeye-app.yaml', 'path: apps/notes', 'latestVersion: "1.0.0"']) {
    const input = validInput();
    input.catalogText = catalogText.replace(native[0], `${native[0]}    ${extra}\n`);
    assert.match(validate(input).join('\n'), new RegExp(`native notes: only id and integration are allowed, found ${extra.split(':')[0]}`), extra);
  }
});

test('provenance rejects missing, duplicate, surplus, stale or malformed records', () => {
  const check = (change) => {
    const input = validInput(); change(input.assetProvenance);
    return validate(input).join('\n');
  };
  assert.match(validate({ ...validInput(), assetProvenance: undefined }).join('\n'), /provenance metadata/);
  assert.match(check(p => p.assets.pop()), /missing asset provenance/);
  assert.match(check(p => p.assets[1] = structuredClone(p.assets[0])), /duplicate asset provenance/);
  assert.match(check(p => p.assets[0].path = 'apps/unknown/icon.svg'), /unknown or missing path/);
  assert.match(check(p => p.assets[0].sha256 = 'sha256:invalid'), /stale asset provenance/);
  for (const evidence of ['approved', '', null]) {
    assert.match(check(p => p.assets[0].evidence = evidence), /invalid asset provenance evidence/);
  }
  for (const source of ['file:///etc/passwd', 'https://user:secret@example.com/icon.svg', 'not a URL', null]) {
    assert.match(check(p => p.assets[0].source = source), /invalid asset provenance source/);
  }
  for (const notes of ['', '  ', null, 42]) {
    assert.match(check(p => p.assets[0].notes = notes), /notes are required/);
  }
  // Unresolved provenance remains factual; it must not be relabelled as approval.
  assert.deepEqual(check(p => { p.assets[0].evidence = 'project-reference'; p.assets[0].notes = 'Exact icon origin remains unresolved.'; }), '');
});

test('a stale asset inventory fails validation', () => {
  const input = validInput();
  input.inventory.assets[0].sha256 = 'sha256:invalid';
  assert.match(validate(input).join('\n'), /asset inventory does not match/);
});

test('catalog.tar holds exactly the snapshot files, normalised', () => {
  const tar = buildCatalogTar(root, snapshot);
  assert.equal(tar.length % 512, 0);
  assert.deepEqual(buildCatalogTar(root, snapshot), tar);
  const entries = readTar(tar);
  assert.deepEqual(entries.map(e => e.name), snapshot.content.files.map(f => f.path));
  for (const [index, entry] of entries.entries()) {
    assert.equal(sha256(entry.data), snapshot.content.files[index].sha256, entry.name);
    assert.deepEqual([entry.type, entry.mode, entry.uid, entry.gid, entry.mtime, entry.uname, entry.gname, entry.magic],
      ['0', 0o644, 0, 0, 0, '', '', 'ustar'], entry.name);
  }
  if (spawnSync('tar', ['--version']).status === 0) {
    const directory = mkdtempSync(join(tmpdir(), 'market-tar-'));
    try {
      writeFileSync(join(directory, 'catalog.tar'), tar);
      const listed = spawnSync('tar', ['-tf', 'catalog.tar'], { cwd: directory, encoding: 'utf8' });
      assert.equal(listed.status, 0, listed.stderr);
      assert.deepEqual(listed.stdout.trim().split('\n'), snapshot.content.files.map(f => f.path));
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }
});

test('release CLI writes the same snapshot and tar from any checkout', (t) => {
  const first = fixture(t);
  const second = fixture(t);
  for (const directory of [first, second]) {
    const result = cli(directory, 'release', 'out');
    assert.equal(result.status, 0, result.stderr);
  }
  for (const name of ['catalog-snapshot.json', 'catalog.tar']) {
    assert.deepEqual(readFileSync(join(first, 'out', name)), readFileSync(join(second, 'out', name)), name);
  }
  assert.deepEqual(JSON.parse(readFileSync(join(first, 'out/catalog-snapshot.json'), 'utf8')), snapshot);
  assert.deepEqual(readFileSync(join(first, 'out/catalog.tar')), buildCatalogTar(root, snapshot));

  const broken = fixture(t);
  writeFileSync(join(broken, 'catalog.yaml'), catalogText.replace(/^(  - id: notes\n    integration: native\n)/m, '$1    branch: dev\n'));
  const refused = cli(broken, 'release', 'out');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /native notes: only id and integration are allowed, found branch/);
  assert.equal(cli(broken, 'release').status, 1);
  assert.equal(cli(broken, 'unknown').status, 1);
});

test('generate CLI rewrites the asset inventory deterministically', (t) => {
  const directory = fixture(t);
  rmSync(join(directory, 'asset-inventory.json'));
  const result = cli(directory, 'generate');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(directory, 'asset-inventory.json'), 'utf8'), readFileSync(join(root, 'asset-inventory.json'), 'utf8'));
  assert.equal(cli(directory, 'validate').status, 0);
});
