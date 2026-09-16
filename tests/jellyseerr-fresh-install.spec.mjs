import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/jellyseerr/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Seerr 3.2.0 uses the reviewed immutable official OCI release', () => {
  assert.match(manifest, /^version: "3\.2\.0"$/m);
  assert.match(catalog, /id: jellyseerr[\s\S]*?latestVersion: "3\.2\.0"/);
  assert.match(manifest, /ghcr\.io\/seerr-team\/seerr@sha256:c4cbd5121236ac2f70a843a0b920b68a27976be57917555f1c45b08a1e6b2aad/);
  assert.doesNotMatch(manifest, /ghcr\.io\/seerr-team\/seerr:[^\s"]+/);
  assert.doesNotMatch(manifest, /fallenbagel\/jellyseerr/);
});

test('Seerr retains its supported app-data path and direct public health check', () => {
  assert.match(manifest, /name: config\n        container: "\/app\/config"\n        type: data/);
  assert.match(manifest, /type: data/);
  assert.match(manifest, /path: "\/api\/v1\/settings\/public"/);
  assert.match(manifest, /PORT: "5055"/);
});

test('Seerr supplies the Alpine resolver compatibility required by scoped service bridges', () => {
  assert.doesNotMatch(manifest, /container: "\/usr\/local\/bin"/);
  assert.match(manifest, /PATH: "\/app\/config\/bin:.*\/usr\/local\/bin/);
  assert.match(manifest, /container: "main"\n    path: "\/app\/config\/bin\/resolvectl"/);
  assert.match(manifest, /permission: "0o755"/);
  assert.match(manifest, /directoryPermission: "0o755"/);
  assert.match(manifest, /      #!\/bin\/sh/);
  assert.match(manifest, /      exit 0/);
});

test('Seerr is protected by YouEye and retains its media-service dependencies', () => {
  assert.match(manifest, /^forwardAuth: enabled$/m);
  assert.match(manifest, /appId: jellyfin/);
  assert.match(manifest, /appId: sonarr/);
  assert.match(manifest, /appId: radarr/);
});

test('Seerr declares the maintained upstream identity and complete release detail', () => {
  assert.match(manifest, /^  name: "Seerr"$/m);
  assert.match(manifest, /sourceCode: "https:\/\/github\.com\/seerr-team\/seerr"/);
  assert.match(manifest, /website: "https:\/\/docs\.seerr\.dev"/);
  for (const field of ['website', 'developer', 'license', 'sourceCode', 'support', 'docs', 'tagline', 'defaultSubdomain']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /iconUrl: "icon\.png"/);
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /longDescription: \|/);
  assert.match(manifest, /screenshots\/platform-admin-request-3\.2\.0\.png/);
  assert.match(manifest, /screenshots\/standard-user-request-3\.2\.0\.png/);
});
