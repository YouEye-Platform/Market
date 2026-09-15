import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = readFileSync(join(root, 'apps/searxng/youeye-app.yaml'), 'utf8');
const catalog = readFileSync(join(root, 'catalog.yaml'), 'utf8');

const expectedVersion = '2026.8.12';
const expectedImages = [
  'docker.io/valkey/valkey@sha256:a038175878d66b9d274fbf8be73c0305e93798b83917647f167e18cef3c71eec',
  'docker.io/searxng/searxng@sha256:c2dc2d9e6b910653e8628361c23443222490e4cabbb9e02667b7847143db843b',
];

test('SearXNG fresh-install version and OCI identities are synchronized and immutable', () => {
  const manifestLines = manifest.split('\n');
  assert.ok(manifestLines.includes(`version: "${expectedVersion}"`));
  for (const image of expectedImages) assert.ok(manifestLines.includes(`    image: "${image}"`));

  const searxngCatalogEntry = catalog.match(
    /^  - id: searxng\n(?:^    .*\n)*?^    latestVersion: "([^"]+)"$/m,
  );
  assert.ok(searxngCatalogEntry, 'catalog.yaml must contain a SearXNG entry');
  assert.equal(searxngCatalogEntry[1], expectedVersion);
});

test('SearXNG keeps generated configuration in its mounted volume and exposes integration formats', () => {
  assert.match(manifest, /name: config\n        container: "\/etc\/searxng"\n        type: config/);
  assert.match(manifest, /container: "main"\n    path: "\/etc\/searxng\/settings\.yml"/);
  assert.match(manifest, /permission: "0o600"/);
  assert.match(manifest, /directoryPermission: "0o700"/);
  assert.match(manifest, /formats:\n          - html\n          - json\n          - rss/);
  assert.match(manifest, /scope: service/);
});

test('SearXNG declares complete upstream and presentation metadata', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'), `missing metadata.${field}`);
  }
  assert.match(manifest, /^  releaseNotes: \|$/m);
  assert.match(manifest, /^  longDescription: \|$/m);
  assert.match(manifest, /path: "screenshots\/admin-search-results\.png"/);
  assert.match(manifest, /path: "screenshots\/user-search-home\.png"/);
});
