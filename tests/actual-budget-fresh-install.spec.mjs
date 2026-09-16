import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/actual-budget/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Actual Budget version and immutable OCI identity are synchronized', () => {
  assert.match(manifest, /^version: "26\.8\.1"$/m);
  assert.match(catalog, /id: actual-budget[\s\S]*?latestVersion: "26\.8\.1"/);
  assert.match(manifest, /docker\.io\/actualbudget\/actual-server@sha256:6478d9ddfc0924479c09e6699c205e354c6f2216dfe7de3c0fb7b590d6edcdc5/);
});

test('Actual Budget retains app-owned persistence and native OIDC', () => {
  assert.match(manifest, /database:\n  mode: none/);
  assert.match(manifest, /name: data[\s\S]*?container: "\/data"/);
  assert.match(manifest, /container: "\/data"/);
  assert.match(manifest, /ACTUAL_OPENID_DISCOVERY_URL: "\$\{sso\.discovery_url\}"/);
  assert.match(manifest, /ACTUAL_OPENID_SERVER_HOSTNAME: "\$\{app\.url\}"/);
  assert.match(manifest, /ACTUAL_USER_CREATION_MODE: "login"/);
});

test('Actual Budget declares complete upstream and presentation metadata', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /^  releaseNotes: \|$/m);
  assert.match(manifest, /^  longDescription: \|$/m);
  assert.match(manifest, /path: "screenshots\/platform-admin-budget\.png"/);
  assert.match(manifest, /path: "screenshots\/standard-user-budget\.png"/);
});
