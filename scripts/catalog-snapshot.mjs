#!/usr/bin/env node
/**
 * Deterministic, local-only catalog snapshot tooling.
 *
 * This tool hashes repository content; it never builds, downloads, uploads, or
 * publishes application binaries or OCI images.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MARKET_IDENTITY = 'YouEye-Platform/Market';
export const SNAPSHOT_API_VERSION = 'youeye.market/catalog-snapshot/v1';
export const ASSET_INVENTORY_API_VERSION = 'youeye.market/asset-inventory/v1';
export const ASSET_PROVENANCE_API_VERSION = 'youeye.market/asset-provenance/v1';
export const RELEASE_BRANCH = 'main';
const DESTINATIONS = ['public', 'forgejo-main', 'github-beta', 'github-main'];
function releaseBranch(destination) { return destination === 'github-beta' ? 'beta' : 'main'; }
function releaseTag(version, branch) { return `catalog-${branch === 'beta' ? 'beta-' : ''}v${version}`; }
const NATIVE_APPS = new Map([
  ['wiki', 'YouEye-Platform/Wiki'],
  ['search', 'YouEye-Platform/Search'],
  ['notes', 'YouEye-Platform/Notes'],
  ['cinema', 'YouEye-Platform/Cinema'],
  ['weather', 'YouEye-Platform/Weather'],
  ['translate', 'YouEye-Platform/Translate'],
]);
const ASSET_EXTENSIONS = new Set(['.png', '.svg', '.jpg', '.jpeg', '.webp']);
const CONTENT_ROOT_FILES = new Set(['catalog.yaml', 'store.yaml', 'RETIRED.md', 'asset-provenance.json']);
const CONTENT_DIRECTORIES = new Set(['apps', 'bundles', 'integrations', 'system', 'updates']);

export function sha256(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function pathCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function catalogApps(catalogText) {
  const entries = [];
  let inApps = false;
  let current = null;
  for (const line of catalogText.split('\n')) {
    if (/^apps:\s*$/.test(line)) { inApps = true; continue; }
    if (inApps && /^[A-Za-z]/.test(line)) break;
    if (!inApps) continue;
    const id = line.match(/^  - id:\s*([a-z0-9-]+)\s*$/)?.[1];
    if (id) {
      if (current) entries.push(current);
      current = { id };
      continue;
    }
    const field = line.match(/^    ([A-Za-z][A-Za-z0-9]*):\s*["']?([^"'\s]+)["']?\s*$/);
    if (field && current) current[field[1]] = field[2];
  }
  if (current) entries.push(current);
  return entries;
}

function walk(root, directory, include) {
  const records = [];
  if (!existsSync(directory)) return records;
  for (const entry of readdirSync(directory).sort(pathCompare)) {
    const absolute = join(directory, entry);
    const info = statSync(absolute);
    if (info.isDirectory()) records.push(...walk(root, absolute, include));
    else if (info.isFile() && include(entry)) {
      records.push({
        path: relative(root, absolute).replaceAll('\\', '/'),
        sha256: sha256(readFileSync(absolute)),
      });
    }
  }
  return records;
}

function walkAssets(root) {
  return walk(root, join(root, 'apps'), (name) => {
    const dot = name.lastIndexOf('.');
    return dot !== -1 && ASSET_EXTENSIONS.has(name.slice(dot).toLowerCase());
  });
}

export function buildContentInventory(root) {
  const files = [];
  for (const path of [...CONTENT_ROOT_FILES].sort(pathCompare)) {
    const absolute = join(root, path);
    if (!existsSync(absolute)) throw new Error(`Canonical catalog input is missing: ${path}`);
    files.push({ path, sha256: sha256(readFileSync(absolute)) });
  }
  for (const directory of [...CONTENT_DIRECTORIES].sort(pathCompare)) {
    files.push(...walk(root, join(root, directory), (name) => /\.ya?ml$/i.test(name)));
  }
  return files.sort((a, b) => pathCompare(a.path, b.path));
}

export function buildAssetInventory(root) {
  return {
    apiVersion: ASSET_INVENTORY_API_VERSION,
    identity: MARKET_IDENTITY,
    purpose: 'Inventory only; no ownership, licence, or redistribution right is asserted.',
    assets: walkAssets(root).map((asset) => ({
      ...asset,
      ownershipStatus: 'unverified',
    })),
  };
}

export function buildSnapshot(root, assetInventory, version, branch = RELEASE_BRANCH) {
  if (!['main', 'beta'].includes(branch)) throw new Error(`Invalid snapshot branch: ${branch}`);
  if (!/^\d+(?:\.\d+){2,7}$/.test(version)) throw new Error(`Invalid snapshot version: ${version}`);
  const contentFiles = buildContentInventory(root);
  const catalogText = readFileSync(join(root, 'catalog.yaml'), 'utf8');
  return {
    apiVersion: SNAPSHOT_API_VERSION,
    identity: MARKET_IDENTITY,
    version,
    provenance: {
      repository: MARKET_IDENTITY,
      releaseBranch: branch,
      releaseTag: releaseTag(version, branch),
      destination: 'catalog.yaml',
    },
    content: {
      algorithm: 'sha256',
      canonicalInputs: 'catalog.yaml, store.yaml, RETIRED.md, asset-provenance.json, and every YAML file under apps/, bundles/, integrations/, system/, and updates/, sorted by repository path; raw file bytes are hashed without network access',
      files: contentFiles,
      sha256: sha256(stableJson(contentFiles)),
    },
    catalog: {
      sha256: sha256(catalogText),
      appCount: catalogApps(catalogText).length,
    },
    assetInventorySha256: sha256(stableJson(assetInventory)),
  };
}

function validateAssetInventory(inventory, root) {
  const errors = [];
  if (inventory?.apiVersion !== ASSET_INVENTORY_API_VERSION) errors.push('asset inventory API version is invalid');
  if (inventory?.identity !== MARKET_IDENTITY) errors.push('asset inventory identity is invalid');
  if (inventory?.purpose !== 'Inventory only; no ownership, licence, or redistribution right is asserted.') {
    errors.push('asset inventory must not assert unverified rights');
  }
  const expected = buildAssetInventory(root);
  if (stableJson(inventory) !== stableJson(expected)) errors.push('asset inventory does not match local asset content or pending legal state');
  return errors;
}

function validateNativeSources(catalogText) {
  const errors = [];
  const apps = new Map(catalogApps(catalogText).map((entry) => [entry.id, entry]));
  for (const [id, repo] of NATIVE_APPS) {
    const app = apps.get(id);
    if (!app) { errors.push(`native ${id}: catalog entry missing`); continue; }
    if (app.repo !== repo) errors.push(`native ${id}: repo must be ${repo}`);
    if (app.branch !== RELEASE_BRANCH) errors.push(`native ${id}: branch must be ${RELEASE_BRANCH}`);
    if (app.manifest !== 'youeye-app.yaml') errors.push(`native ${id}: manifest destination must be youeye-app.yaml`);
    if (app.integration !== 'native') errors.push(`native ${id}: integration must be native`);
    if (app.path || app.latestVersion) errors.push(`native ${id}: must not impersonate a local container app`);
  }
  return errors;
}

function validateAssetProvenance(provenance, inventory) {
  if (!provenance || provenance.apiVersion !== ASSET_PROVENANCE_API_VERSION ||
      provenance.identity !== MARKET_IDENTITY || !Array.isArray(provenance.assets)) {
    return ['asset provenance metadata is missing or invalid'];
  }
  const errors = [];
  const expected = new Map((inventory?.assets ?? []).map(asset => [asset.path, asset.sha256]));
  const seen = new Set();
  for (const record of provenance.assets) {
    if (!record || typeof record.path !== 'string' || !expected.has(record.path)) {
      errors.push('asset provenance has an unknown or missing path');
      continue;
    }
    if (seen.has(record.path)) errors.push(`duplicate asset provenance: ${record.path}`);
    seen.add(record.path);
    if (record.sha256 !== expected.get(record.path)) errors.push(`stale asset provenance: ${record.path}`);
    if (!['exact-source', 'project-reference', 'local-capture'].includes(record.evidence)) {
      errors.push(`invalid asset provenance evidence: ${record.path}`);
    }
    let source;
    try { source = new URL(record.source); } catch { /* reported below */ }
    if (!source || source.protocol !== 'https:' || source.username || source.password) {
      errors.push(`invalid asset provenance source: ${record.path}`);
    }
    if (typeof record.notes !== 'string' || !record.notes.trim()) {
      errors.push(`asset provenance notes are required: ${record.path}`);
    }
  }
  for (const path of expected.keys()) if (!seen.has(path)) errors.push(`missing asset provenance: ${path}`);
  return errors;
}

function localReleaseContext(root) {
  try {
    const branch = execFileSync('git', ['-C', root, 'branch', '--show-current'], { encoding: 'utf8' }).trim();
    const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const tagsAtHead = execFileSync('git', ['-C', root, 'tag', '--points-at', 'HEAD'], { encoding: 'utf8' })
      .split(/\r?\n/).filter(Boolean);
    const dirty = execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' }).trim() !== '';
    return { branch, head, tagsAtHead, dirty };
  } catch (error) {
    throw new Error(`release validation requires a local Git checkout: ${error.message}`);
  }
}

function validateReleaseRef(snapshot, context, destination) {
  const branch = releaseBranch(destination);
  const errors = [];
  const expectedTag = releaseTag(snapshot?.version, branch);
  if (!context) return ['release validation requires verified local Git branch and tag context'];
  if (context.branch !== branch) errors.push(`release checkout branch must be ${branch}; found ${context.branch || 'detached'}`);
  if (!context.tagsAtHead.includes(expectedTag)) errors.push(`release checkout HEAD must be tagged exactly ${expectedTag}`);
  if (context.dirty) errors.push('release checkout must have no tracked or untracked changes');
  return errors;
}

export function validate({ root, catalogText, snapshot, inventory, assetProvenance, release = false, releaseContext, destination = 'public' }) {
  const errors = [];
  if (!DESTINATIONS.includes(destination)) errors.push('unknown release destination');
  if (destination !== 'public' && !release) errors.push('release destination requires release validation');
  if (snapshot?.apiVersion !== SNAPSHOT_API_VERSION) errors.push('snapshot API version is invalid');
  if (snapshot?.identity !== MARKET_IDENTITY) errors.push('snapshot identity is invalid');
  if (!/^\d+(?:\.\d+){2,7}$/.test(snapshot?.version ?? '')) errors.push('snapshot version must have 3 to 8 numeric positions');
  const provenance = snapshot?.provenance ?? {};
  if (provenance.repository !== MARKET_IDENTITY) errors.push('snapshot provenance repository is invalid');
  const branch = release ? releaseBranch(destination) : provenance.releaseBranch;
  if (!['main', 'beta'].includes(branch) || provenance.releaseBranch !== branch) errors.push(`snapshot release branch must be ${branch}`);
  if (provenance.releaseTag !== releaseTag(snapshot?.version, branch)) errors.push('snapshot release tag must match snapshot version');
  if (provenance.destination !== 'catalog.yaml') errors.push('snapshot provenance destination must be catalog.yaml');

  let expectedContent;
  try { expectedContent = buildContentInventory(root); }
  catch (error) { errors.push(error.message); expectedContent = []; }
  if (stableJson(snapshot?.content?.files) !== stableJson(expectedContent)) errors.push('snapshot canonical content file list or digest entries do not match local catalog content');
  if (snapshot?.content?.sha256 !== sha256(stableJson(expectedContent))) errors.push('snapshot canonical content set digest does not match local catalog content');
  if (snapshot?.content?.algorithm !== 'sha256' || typeof snapshot?.content?.canonicalInputs !== 'string') errors.push('snapshot canonical content contract is invalid');
  if (snapshot?.catalog?.sha256 !== sha256(catalogText)) errors.push('snapshot catalog digest does not match catalog.yaml');
  if (snapshot?.catalog?.appCount !== catalogApps(catalogText).length) errors.push('snapshot app count does not match catalog.yaml');
  errors.push(...validateNativeSources(catalogText));
  errors.push(...validateAssetInventory(inventory, root));
  if (snapshot?.assetInventorySha256 !== sha256(stableJson(inventory))) errors.push('snapshot asset inventory digest does not match asset inventory');
  errors.push(...validateAssetProvenance(assetProvenance, inventory));
  if (release) {
    if (destination === 'forgejo-main' && !/^\d+(?:\.\d+){4}$/.test(snapshot?.version ?? '')) errors.push('Forgejo main requires five numeric version positions');
    if (destination === 'github-beta' && !/^\d+(?:\.\d+){3}$/.test(snapshot?.version ?? '')) errors.push('GitHub beta requires four numeric version positions');
    if (destination === 'github-main' && !/^\d+(?:\.\d+){2}$/.test(snapshot?.version ?? '')) errors.push('GitHub main requires three numeric version positions');
    errors.push(...validateReleaseRef(snapshot, releaseContext, destination));
  }
  return errors;
}

function parseArguments(args) {
  let command = 'validate', version, branch, release = false, destination = 'public';
  let commandSeen = false;
  for (let i = 0; i < args.length; i++) {
    const argument = args[i];
    if (argument === '--release') release = true;
    else if (argument === '--version' || argument === '--destination' || argument === '--branch') {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
      if (argument === '--version') version = value;
      else if (argument === '--branch') branch = value;
      else destination = value;
    } else if (!argument.startsWith('--') && !commandSeen) {
      command = argument;
      commandSeen = true;
    } else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!DESTINATIONS.includes(destination)) throw new Error('Unknown release destination');
  if (destination !== 'public' && (!release || command !== 'validate')) throw new Error('Release destination requires validate --release');
  if (branch !== undefined && (command !== 'generate' || !['main', 'beta'].includes(branch))) throw new Error('--branch requires generate and main or beta');
  return { command, version, branch, release, destination };
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const { command, version, branch, release, destination } = parseArguments(process.argv.slice(2));
  const catalogText = readFileSync(join(root, 'catalog.yaml'), 'utf8');
  const snapshotPath = join(root, 'catalog-snapshot.json');
  const inventoryPath = join(root, 'asset-inventory.json');
  const provenancePath = join(root, 'asset-provenance.json');

  if (command === 'generate') {
    const prior = existsSync(snapshotPath) ? JSON.parse(readFileSync(snapshotPath, 'utf8')) : undefined;
    const inventory = buildAssetInventory(root);
    const snapshot = buildSnapshot(root, inventory, version ?? prior?.version ?? '0.5.0.0.0.1', branch ?? prior?.provenance?.releaseBranch ?? RELEASE_BRANCH);
    writeFileSync(inventoryPath, stableJson(inventory));
    writeFileSync(snapshotPath, stableJson(snapshot));
    return;
  }
  if (command !== 'validate') throw new Error(`Unknown command: ${command}`);
  const errors = validate({
    root,
    catalogText,
    snapshot: JSON.parse(readFileSync(snapshotPath, 'utf8')),
    inventory: JSON.parse(readFileSync(inventoryPath, 'utf8')),
    assetProvenance: existsSync(provenancePath) ? JSON.parse(readFileSync(provenancePath, 'utf8')) : undefined,
    release,
    destination,
    releaseContext: release ? localReleaseContext(root) : undefined,
  });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(release
    ? `Market catalog release ${snapshotPath} is valid for ${destination} and the checked-out ${releaseBranch(destination)} tag.`
    : `Market catalog source candidate ${snapshotPath} is internally valid; no release ref is asserted.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
