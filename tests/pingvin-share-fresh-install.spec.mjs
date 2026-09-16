import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/pingvin-share/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Pingvin Share X 1.22.1 uses the maintained immutable official release', () => {
  assert.match(manifest, /version: "1\.22\.1"/);
  assert.match(catalog, /id: pingvin-share[\s\S]*?latestVersion: "1\.22\.1"/);
  assert.match(manifest, /docker\.io\/smp46\/pingvin-share-x@sha256:38480232d3ec26858e0313e09584b662fde356a32aaf83f6270f26c5414065ec/);
  assert.match(manifest, /license: "BSD-2-Clause"/);
});

test('Pingvin Share X bootstraps its advertised administrator and persists all app-owned state', () => {
  assert.match(manifest, /password: "\$\{secrets\.admin_password\}"/);
  assert.match(manifest, /chown 100:1000 \/opt\/app\/config\/config\.yaml/);
  assert.match(manifest, /CONFIG_FILE: "\/opt\/app\/config\/config\.yaml"/);
  assert.match(manifest, /DATABASE_URL: "file:\.\.\/data\/pingvin-share\.db\?connection_limit=1"/);
  assert.match(manifest, /container: "\/opt\/app\/backend\/data"/);
  assert.match(manifest, /container: "\/opt\/app\/frontend\/public\/img"/);
  assert.match(manifest, /name: config\n        container: "\/opt\/app\/config"\n        type: config/);
  assert.match(manifest, /container: "main"\n    path: "\/opt\/app\/config\/config\.yaml"/);
  assert.match(manifest, /appUrl: "\$\{app\.url\}"/);
  assert.match(manifest, /TRUST_PROXY: "true"/);
  assert.match(manifest, /PUID: "100"/);
  assert.match(manifest, /PGID: "1000"/);
});

test('Pingvin Share X declares complete metadata and local acceptance screenshots', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /screenshots\/platform-admin-share-1\.22\.1\.png/);
  assert.match(manifest, /screenshots\/standard-user-share-1\.22\.1\.png/);
});
