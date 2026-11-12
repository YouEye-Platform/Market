#!/usr/bin/env node
/**
 * Deterministic, local-only Market catalog tooling.
 *
 *   node scripts/catalog-snapshot.mjs generate        rewrite asset-inventory.json from the images under apps/
 *   node scripts/catalog-snapshot.mjs validate        check catalog content, native entries, asset inventory and provenance
 *   node scripts/catalog-snapshot.mjs release <dir>   validate, then write <dir>/catalog-snapshot.json and <dir>/catalog.tar
 *
 * The snapshot and catalog.tar depend only on the repository content. They carry no
 * version, branch, repository or host, so the same commit gives the same bytes on every
 * host and channel. The release version lives only in product-release.json.
 *
 * This tool hashes repository content; it never builds, downloads, uploads, or
 * publishes application binaries or OCI images.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MARKET_IDENTITY = 'YouEye-Platform/Market';
export const SNAPSHOT_API_VERSION = 'youeye.market/catalog-snapshot/v1';
export const ASSET_INVENTORY_API_VERSION = 'youeye.market/asset-inventory/v1';
export const ASSET_PROVENANCE_API_VERSION = 'youeye.market/asset-provenance/v1';
export const CANONICAL_INPUTS = 'RETIRED.md, asset-inventory.json, asset-provenance.json, catalog.yaml, store.yaml, and every file under apps/, bundles/, integrations/, system/, and updates/ (dot files excluded), sorted by repository path; raw file bytes are hashed without network access';
const ASSET_EXTENSIONS = new Set(['.png', '.svg', '.jpg', '.jpeg', '.webp']);
const CONTENT_ROOT_FILES = ['RETIRED.md', 'asset-inventory.json', 'asset-provenance.json', 'catalog.yaml', 'store.yaml'];
const CONTENT_DIRECTORIES = ['apps', 'bundles', 'integrations', 'system', 'updates'];
const NATIVE_ENTRY_FIELDS = ['id', 'integration'];

export function sha256(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function pathCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Catalog `apps:` entries with their single-line scalar fields. */
export function catalogApps(catalogText) {
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
    if (entry.startsWith('.')) continue;
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

/** Every file the catalog release carries, sorted by path. */
export function buildContentInventory(root) {
  const files = [];
  for (const path of CONTENT_ROOT_FILES) {
    const absolute = join(root, path);
    if (!existsSync(absolute)) throw new Error(`Canonical catalog input is missing: ${path}`);
    files.push({ path, sha256: sha256(readFileSync(absolute)) });
  }
  for (const directory of CONTENT_DIRECTORIES) files.push(...walk(root, join(root, directory), () => true));
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

export function buildSnapshot(root) {
  const files = buildContentInventory(root);
  const catalogText = readFileSync(join(root, 'catalog.yaml'), 'utf8');
  return {
    apiVersion: SNAPSHOT_API_VERSION,
    identity: MARKET_IDENTITY,
    content: {
      algorithm: 'sha256',
      canonicalInputs: CANONICAL_INPUTS,
      files,
      sha256: sha256(stableJson(files)),
    },
    catalog: {
      sha256: sha256(catalogText),
      appCount: catalogApps(catalogText).length,
    },
  };
}

export function snapshotBytes(snapshot) {
  return Buffer.from(stableJson(snapshot));
}

function octal(value, width) {
  const text = value.toString(8);
  if (text.length > width - 1) throw new Error(`tar field overflow: ${value}`);
  return text.padStart(width - 1, '0') + '\0';
}

function tarHeader(path, size) {
  const header = Buffer.alloc(512);
  let name = path;
  let prefix = '';
  if (Buffer.byteLength(path) > 100) {
    const cut = path.lastIndexOf('/', 155);
    if (cut <= 0 || Buffer.byteLength(path.slice(cut + 1)) > 100) throw new Error(`path too long for a ustar tar: ${path}`);
    prefix = path.slice(0, cut);
    name = path.slice(cut + 1);
  }
  header.write(name, 0, 100, 'utf8');
  header.write(octal(0o644, 8), 100, 8, 'ascii');
  header.write(octal(0, 8), 108, 8, 'ascii');
  header.write(octal(0, 8), 116, 8, 'ascii');
  header.write(octal(size, 12), 124, 12, 'ascii');
  header.write(octal(0, 12), 136, 12, 'ascii');
  header.fill(0x20, 148, 156);
  header.write('0', 156, 1, 'ascii');
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');
  header.write(octal(0, 8), 329, 8, 'ascii');
  header.write(octal(0, 8), 337, 8, 'ascii');
  header.write(prefix, 345, 155, 'utf8');
  let checksum = 0;
  for (const byte of header) checksum += byte;
  header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii');
  return header;
}

/**
 * A plain ustar archive of exactly the snapshot's files, in snapshot order: regular
 * files only, mode 0644, uid/gid 0, no owner names, mtime 0. Each file's bytes are
 * checked against the snapshot while writing.
 */
export function buildCatalogTar(root, snapshot) {
  const blocks = [];
  for (const file of snapshot.content.files) {
    const bytes = readFileSync(join(root, file.path));
    if (sha256(bytes) !== file.sha256) throw new Error(`catalog file changed while packing: ${file.path}`);
    blocks.push(tarHeader(file.path, bytes.length), bytes);
    const padding = (512 - (bytes.length % 512)) % 512;
    if (padding) blocks.push(Buffer.alloc(padding));
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
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

/** Native apps are named by id only; the box resolves them through its channel index. */
export function validateNativeEntries(catalogText) {
  const errors = [];
  for (const entry of catalogApps(catalogText)) {
    if (entry.integration !== 'native') continue;
    for (const field of Object.keys(entry)) {
      if (!NATIVE_ENTRY_FIELDS.includes(field)) errors.push(`native ${entry.id}: only id and integration are allowed, found ${field}`);
    }
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

export function validate({ root, catalogText, inventory, assetProvenance }) {
  const errors = [];
  try { buildContentInventory(root); } catch (error) { errors.push(error.message); }
  errors.push(...validateNativeEntries(catalogText));
  errors.push(...validateAssetInventory(inventory, root));
  errors.push(...validateAssetProvenance(assetProvenance, inventory));
  return errors;
}

function readInputs(root) {
  const provenancePath = join(root, 'asset-provenance.json');
  return {
    root,
    catalogText: readFileSync(join(root, 'catalog.yaml'), 'utf8'),
    inventory: JSON.parse(readFileSync(join(root, 'asset-inventory.json'), 'utf8')),
    assetProvenance: existsSync(provenancePath) ? JSON.parse(readFileSync(provenancePath, 'utf8')) : undefined,
  };
}

/** Writes catalog-snapshot.json and catalog.tar for a release into `directory`. */
export function writeRelease(root, directory) {
  const errors = validate(readInputs(root));
  if (errors.length) throw new Error(errors.join('\n'));
  const snapshot = buildSnapshot(root);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'catalog-snapshot.json'), snapshotBytes(snapshot));
  writeFileSync(join(directory, 'catalog.tar'), buildCatalogTar(root, snapshot));
  return snapshot;
}

const USAGE = 'usage: catalog-snapshot.mjs generate | validate | release <output directory>';

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const [command = 'validate', ...rest] = process.argv.slice(2);
  if (command === 'generate' && rest.length === 0) {
    writeFileSync(join(root, 'asset-inventory.json'), stableJson(buildAssetInventory(root)));
    return;
  }
  if (command === 'validate' && rest.length === 0) {
    const errors = validate(readInputs(root));
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Market catalog is valid.');
    return;
  }
  if (command === 'release' && rest.length === 1) {
    const directory = resolve(rest[0]);
    const snapshot = writeRelease(root, directory);
    console.log(`Wrote catalog-snapshot.json and catalog.tar (${snapshot.content.files.length} files) to ${directory}`);
    return;
  }
  throw new Error(USAGE);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
