import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARKET_IDENTITY,
  buildAssetInventory,
  buildSnapshot,
  validate,
} from '../scripts/catalog-snapshot.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const catalogText = readFileSync(join(root, 'catalog.yaml'), 'utf8');
const snapshot = JSON.parse(readFileSync(join(root, 'catalog-snapshot.json'), 'utf8'));
const inventory = JSON.parse(readFileSync(join(root, 'asset-inventory.json'), 'utf8'));
const assetProvenance = JSON.parse(readFileSync(join(root, 'asset-provenance.json'), 'utf8'));

function validInput() {
  return {
    root,
    catalogText,
    snapshot: { ...structuredClone(snapshot), provenance: { ...snapshot.provenance, releaseBranch: 'main', releaseTag: `catalog-v${snapshot.version}` } },
    inventory: structuredClone(inventory),
    assetProvenance: structuredClone(assetProvenance),
  };
}

function releaseContext(overrides = {}) {
  return {
    branch: 'main',
    head: '0123456789abcdef0123456789abcdef01234567',
    tagsAtHead: [`catalog-v${snapshot.version}`],
    dirty: false,
    ...overrides,
  };
}

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'market-snapshot-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  cpSync(root, directory, { recursive: true, filter: (path) => !path.split('/').includes('.git') });
  return directory;
}

test('catalog snapshot and asset inventory are deterministic local content records', () => {
  const generatedInventory = buildAssetInventory(root);
  const generatedSnapshot = buildSnapshot(root, generatedInventory, snapshot.version, snapshot.provenance.releaseBranch);
  assert.deepEqual(inventory, generatedInventory);
  assert.deepEqual(snapshot, generatedSnapshot);
  assert.deepEqual(validate({ ...validInput(), snapshot }), []);
  assert.deepEqual(validate(validInput()), []);
});

test('real manifest version and OCI digest changes invalidate the snapshot and change its identity', (t) => {
  const directory = fixture(t);
  const path = join(directory, 'apps/immich/youeye-app.yaml');
  const original = readFileSync(path, 'utf8');
  for (const changed of [
    original.replace(/^version:.*$/m, 'version: "999.0.0"'),
    original.replace(/sha256:[a-f0-9]{64}/, `sha256:${'0'.repeat(64)}`),
  ]) {
    assert.notEqual(changed, original, 'fixture must change a real version or OCI digest');
    writeFileSync(path, changed);
    const next = buildSnapshot(directory, inventory, snapshot.version);
    assert.notEqual(next.content.sha256, snapshot.content.sha256);
    assert.match(validate({ ...validInput(), root: directory }).join('\n'), /canonical content/);
  }
});

test('every inventoried YAML input and added or removed canonical manifest affects identity', (t) => {
  const directory = fixture(t);
  for (const input of snapshot.content.files) {
    const path = join(directory, input.path);
    const original = readFileSync(path);
    writeFileSync(path, Buffer.concat([original, Buffer.from('\n# changed input\n')]));
    assert.notEqual(buildSnapshot(directory, inventory, snapshot.version).content.sha256,
      snapshot.content.sha256, input.path);
    writeFileSync(path, original);
  }
  for (const area of ['apps', 'bundles', 'integrations', 'system', 'updates']) {
    const path = join(directory, area, 'added-fixture.yaml');
    mkdirSync(join(directory, area), { recursive: true });
    writeFileSync(path, 'fixture: true\n');
    assert.notEqual(buildSnapshot(directory, inventory, snapshot.version).content.sha256, snapshot.content.sha256);
    assert.match(validate({ ...validInput(), root: directory }).join('\n'), /canonical content/);
    rmSync(path);
  }
  rmSync(join(directory, 'apps/immich/youeye-app.yaml'));
  assert.match(validate({ ...validInput(), root: directory }).join('\n'), /canonical content/);
});

test('snapshot rejects malformed and missing catalog pins', () => {
  const malformed = validInput();
  malformed.snapshot.catalog.sha256 = 'sha256:not-a-digest';
  assert.match(validate(malformed).join('\n'), /catalog digest/);

  const missing = validInput();
  delete missing.snapshot.catalog;
  assert.match(validate(missing).join('\n'), /catalog digest/);
});

test('snapshot rejects false Market provenance and identity', () => {
  const falseIdentity = validInput();
  falseIdentity.snapshot.identity = 'third-party/market';
  assert.match(validate(falseIdentity).join('\n'), /snapshot identity/);

  const falseProvenance = validInput();
  falseProvenance.snapshot.provenance.repository = 'third-party/market';
  assert.match(validate(falseProvenance).join('\n'), /provenance repository/);
});

test('snapshot rejects malformed and missing release branch, tag, and destination pins', () => {
  for (const [field, value, expected] of [
    ['releaseBranch', 'release', /release branch/],
    ['releaseBranch', undefined, /release branch/],
    ['releaseTag', 'v9.9.9', /release tag/],
    ['releaseTag', undefined, /release tag/],
    ['destination', 'apps/immich/youeye-app.yaml', /provenance destination/],
    ['destination', undefined, /provenance destination/],
  ]) {
    const input = validInput();
    input.snapshot.provenance[field] = value;
    assert.match(validate(input).join('\n'), expected, `${field}=${value}`);
  }
});

test('snapshot rejects invalid native source references without inspecting remote repos', () => {
  const badSource = catalogText.replace('branch: main\n    manifest: youeye-app.yaml', 'branch: release\n    manifest: app.yaml');
  const input = validInput();
  input.catalogText = badSource;
  assert.match(validate(input).join('\n'), /native wiki: branch must be main/);
  assert.match(validate(input).join('\n'), /native wiki: manifest destination must be youeye-app.yaml/);
});

test('source-candidate validation does not falsely attest the local release ref', () => {
  assert.deepEqual(validate(validInput()), []);
  const errors = validate({
    ...validInput(),
    release: true,
    releaseContext: releaseContext({ branch: 'dev', tagsAtHead: [] }),
  });
  assert.match(errors.join('\n'), /checkout branch must be main/);
  assert.match(errors.join('\n'), /HEAD must be tagged exactly/);
});

test('development and public release validate factual evidence without reviewer approval', () => {
  assert.deepEqual(validate({ ...validInput(), release: true, releaseContext: releaseContext() }), []);
  for (const release of [false, true]) {
    const input = { ...validInput(), release, releaseContext: releaseContext() };
    assert.match(validate({ ...input, assetProvenance: undefined }).join('\n'), /provenance metadata/);
    // Unresolved provenance remains factual; it must not be relabelled as approval.
    input.assetProvenance.assets[0].evidence = 'project-reference';
    input.assetProvenance.assets[0].notes = 'Exact icon origin remains unresolved.';
    assert.deepEqual(validate(input), []);
  }
});

test('provenance rejects missing, duplicate, surplus, stale or malformed records', () => {
  const check = (change) => {
    const input = validInput(); change(input.assetProvenance);
    return validate(input).join('\n');
  };
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
});

test('provenance records are bound into the snapshot content hash', t => {
  const directory = fixture(t);
  const changed = structuredClone(assetProvenance);
  changed.assets[0].notes += ' Changed source assessment.';
  writeFileSync(join(directory, 'asset-provenance.json'), JSON.stringify(changed));
  assert.notEqual(buildSnapshot(directory, inventory, snapshot.version).content.sha256, snapshot.content.sha256);
  assert.match(validate({ ...validInput(), root: directory, assetProvenance: changed }).join('\n'), /canonical content/);
});

test('release CLI verifies real branch, tag and clean state without a separate approval file', (t) => {
  const directory = fixture(t);
  const releaseSnapshot = { ...structuredClone(snapshot), version: '0.6.0.0.1' };
  releaseSnapshot.provenance.releaseBranch = 'main';
  releaseSnapshot.provenance.releaseTag = `catalog-v${releaseSnapshot.version}`;
  writeFileSync(join(directory, 'catalog-snapshot.json'), JSON.stringify(releaseSnapshot));
  // Obsolete human-approval files are not required.
  rmSync(join(directory, 'asset-approvals.json'), { force: true });
  const git = (...args) => execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8' }).trim();
  const cli = (...args) => spawnSync(process.execPath, ['scripts/catalog-snapshot.mjs', 'validate', ...args], {
    cwd: directory, encoding: 'utf8',
    env: { ...process.env, RELEASE_BRANCH: 'main', RELEASE_TAG: `catalog-v${releaseSnapshot.version}` },
  });
  git('init', '--initial-branch=dev', '--template=');
  git('config', 'user.name', 'Snapshot test fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'commit.gpgsign', 'false');
  git('add', '.');
  git('commit', '-m', 'Local test fixture');
  const source = cli();
  assert.equal(source.status, 0, source.stderr);
  assert.match(source.stdout, /source candidate.*no release ref is asserted/);
  const wrongRef = cli('--release');
  assert.equal(wrongRef.status, 1);
  assert.match(wrongRef.stderr, /checkout branch must be main/);
  assert.match(wrongRef.stderr, /HEAD must be tagged exactly/);
  assert.match(cli('--release', '--destination', 'forgejo-main').stderr, /checkout branch must be main/);
  assert.equal(cli('--release', '--destination', 'typo').status, 1);
  assert.equal(cli('--destination', 'forgejo-main').status, 1);
  git('checkout', '-b', 'main');
  git('-c', 'tag.gpgSign=false', 'tag', `catalog-v${releaseSnapshot.version}`);
  const privateRelease = cli('--release', '--destination', 'forgejo-main');
  assert.equal(privateRelease.status, 0, privateRelease.stderr);
  const publicRelease = cli('--release');
  assert.equal(publicRelease.status, 0, publicRelease.stderr);
  writeFileSync(join(directory, 'untracked.txt'), 'dirty fixture');
  assert.match(cli('--release').stderr, /checkout must have no tracked or untracked changes/);
  assert.match(cli('--release', '--destination', 'forgejo-main').stderr, /checkout must have no tracked or untracked changes/);
  git('add', 'untracked.txt');
  git('commit', '-m', 'Change after release tag');
  assert.match(cli('--release').stderr, /HEAD must be tagged exactly/);
  git('checkout', `catalog-v${releaseSnapshot.version}`);
  assert.match(cli('--release').stderr, /checkout branch must be main; found detached/);
});

test('private Forgejo validation retains tag and content integrity checks', () => {
  const input = { ...validInput(), release: true, destination: 'forgejo-main', releaseContext: releaseContext() };
  input.snapshot.version = '0.6.0.0.1';
  input.snapshot.provenance.releaseTag = 'catalog-v0.6.0.0.1';
  input.releaseContext.tagsAtHead = ['catalog-v0.6.0.0.1'];
  assert.deepEqual(validate(input), []);
  assert.match(validate({ ...input, releaseContext: releaseContext({ tagsAtHead: [] }) }).join('\n'), /HEAD must be tagged exactly/);
  input.snapshot.content.sha256 = 'sha256:invalid';
  assert.match(validate(input).join('\n'), /canonical content set digest/);
  input.inventory.assets[0].sha256 = 'sha256:invalid';
  assert.match(validate(input).join('\n'), /asset inventory does not match/);
});

test('catalog source supports channel depths while Forgejo main enforces five positions', () => {
 for (const version of ['0.6.0', '0.6.0.1', '0.6.0.0.1', '0.6.0.0.0.1']) {
  const input = validInput();
  input.snapshot = buildSnapshot(root, inventory, version);
  assert.deepEqual(validate(input), []);
  const errors = validate({ ...input, release: true, destination: 'forgejo-main', releaseContext: releaseContext({ tagsAtHead: [`catalog-v${version}`] }) });
  assert.equal(errors.length === 0, version.split('.').length === 5, version);
 }
});

for (const [destination, branch, version, tag] of [
  ['github-beta', 'beta', '0.6.0.1', 'catalog-beta-v0.6.0.1'],
  ['github-main', 'main', '0.6.1', 'catalog-v0.6.1'],
]) {
  test(`${destination} requires matching branch, tag, depth and asset integrity`, () => {
    const input = { ...validInput(), release: true, destination,
      releaseContext: releaseContext({ branch, tagsAtHead: [tag] }) };
    input.snapshot.version = version;
    input.snapshot.provenance.releaseBranch = branch;
    input.snapshot.provenance.releaseTag = tag;
    assert.deepEqual(validate(input), []);
    assert.match(validate({ ...input, assetProvenance: undefined }).join('\n'), /asset provenance metadata/);
    assert.match(validate({ ...input, releaseContext: releaseContext({ branch: 'dev', tagsAtHead: [tag] }) }).join('\n'), /checkout branch/);
    assert.match(validate({ ...input, releaseContext: releaseContext({ branch, tagsAtHead: [] }) }).join('\n'), /tagged exactly/);
    input.snapshot.version += '.1';
    input.snapshot.provenance.releaseTag += '.1';
    input.releaseContext.tagsAtHead = [input.snapshot.provenance.releaseTag];
    assert.match(validate(input).join('\n'), /numeric version positions/);
  });
}


test('snapshot generation selects and preserves the declared release branch', t => {
  const directory = fixture(t);
  const cli = (...args) => spawnSync(process.execPath, ['scripts/catalog-snapshot.mjs', ...args], { cwd: directory, encoding: 'utf8' });
  assert.throws(() => buildSnapshot(root, inventory, '1.2.3', 'dev'), /Invalid snapshot branch/);
  assert.equal(cli('generate', '--branch', 'dev').status, 1);
  assert.equal(cli('validate', '--branch', 'beta').status, 1);
  for (const [branch, version, tag] of [['beta', '1.2.3.4', 'catalog-beta-v1.2.3.4'], ['main', '1.2.3', 'catalog-v1.2.3']]) {
    const first = cli('generate', '--version', version, '--branch', branch);
    assert.equal(first.status, 0, first.stderr);
    const before = readFileSync(join(directory, 'catalog-snapshot.json'), 'utf8');
    assert.equal(JSON.parse(before).provenance.releaseTag, tag);
    const repeat = cli('generate');
    assert.equal(repeat.status, 0, repeat.stderr);
    assert.equal(readFileSync(join(directory, 'catalog-snapshot.json'), 'utf8'), before);
    assert.equal(cli('validate').status, 0);
  }
});

test('native references reject the historical nonexistent public repository names', () => {
  const input = validInput();
  input.catalogText = catalogText.replace(/repo: [^\n]*\/(?:YE-App-)?Wiki\n/, 'repo: YouEye-Platform/YE-App-Wiki\n');
  assert.match(validate(input).join('\n'), /native wiki: repo must be/);
});
