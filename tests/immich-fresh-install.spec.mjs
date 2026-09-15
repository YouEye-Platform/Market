import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = readFileSync(join(root, 'apps/immich/youeye-app.yaml'), 'utf8');
const integration = readFileSync(join(root, 'integrations/immich/youeye-id.yaml'), 'utf8');
const catalog = readFileSync(join(root, 'catalog.yaml'), 'utf8');

const expectedImages = [
  'ghcr.io/immich-app/postgres@sha256:bcf63357191b76a916ae5eb93464d65c07511da41e3bf7a8416db519b40b1c23',
  'docker.io/valkey/valkey@sha256:8e8d64b405ce18f41b8e5ee20aa4687a8ed0022d1298f2ce31cdcf3a76e09411',
  'ghcr.io/immich-app/immich-server@sha256:b434cb9287eea1471c9974845914d4dd328c9c2d652e446ed4930f99944f0ceb',
  'ghcr.io/immich-app/immich-machine-learning@sha256:5a0839dc5303cd7215bcd2180a26aed3af41675aefb3e75e5157e9f10ad16e6e',
];

test('Immich version and OCI identities are synchronized and immutable', () => {
  assert.match(manifest, /^version: "3\.1\.0"$/m);
  assert.match(catalog, /^  - id: immich\n    path: apps\/immich\n    integration: basic\n    latestVersion: "3\.1\.0"$/m);

  const imageLines = [...manifest.matchAll(/^    image: "([^"]+)"$/gm)].map((match) => match[1]);
  assert.deepEqual(imageLines, expectedImages);
  for (const image of imageLines) {
    assert.match(image, /@sha256:[a-f0-9]{64}$/);
    assert.doesNotMatch(image, /:(latest|release)(?:@|$)/);
  }
});

test('Immich 3 keeps all durable data in logical volumes and only ML cache disposable', () => {
  assert.match(manifest, /name: pgdata\n        container: "\/var\/lib\/postgresql\/data"\n        type: data/);
  assert.match(manifest, /name: upload\n        container: "\/data"/);
  assert.match(manifest, /name: mlcache\n        container: "\/cache"\n        type: cache/);
  assert.doesNotMatch(manifest, /^\s+host:/m);
  assert.match(manifest, /name: upload\n        container: "\/data"\n        type: data/);
  assert.match(manifest, /name: mlcache[\s\S]*type: cache/);
  assert.doesNotMatch(manifest, /exclude:/);
  assert.doesNotMatch(manifest, /\/usr\/src\/app\/upload/);
});

test('Immich does not globally disable TLS verification', () => {
  assert.doesNotMatch(manifest, /NODE_TLS_REJECT_UNAUTHORIZED/);
});

test('Immich identity integration is scoped to 3.1 and permits only its internal HTTP issuer', () => {
  assert.match(integration, /^  version: "3\.1\.x"$/m);
  assert.match(integration, /^              oauth\.allowInsecureRequests: true$/m);
  assert.match(integration, /\$\{sso\.issuer\} is the Control Panel's app-network-only HTTP authority/);
  assert.doesNotMatch(integration, /NODE_TLS_REJECT_UNAUTHORIZED/);
});
