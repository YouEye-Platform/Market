import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/stirling-pdf/youeye-app.yaml', import.meta.url), 'utf8');

test('Stirling-PDF 2.14.3 uses the official immutable OCI release', () => {
  assert.match(manifest, /version: "2\.14\.3"/);
  assert.match(manifest, /docker\.io\/stirlingtools\/stirling-pdf@sha256:3b3670fce70b396ec56ba380a3cc7858e0abf83fe13f31c88f7737847763a396/);
});

test('Stirling-PDF persists its supported PDF workflow and account state paths', () => {
  for (const path of ['/usr/share/tessdata', '/configs', '/customFiles', '/pipeline']) {
    assert.match(manifest, new RegExp(`container: "${path}"`));
  }
  assert.match(manifest, /path: "\/api\/v1\/info\/status"/);
});

test('Stirling-PDF keeps its supported local-login contract explicit and safe', () => {
  assert.match(manifest, /SECURITY_ENABLELOGIN: "true"/);
  assert.match(manifest, /SECURITY_LOGINMETHOD: "normal"/);
  assert.match(manifest, /SECURITY_INITIALLOGIN_PASSWORD: "\$\{secrets\.admin_password\}"/);
  assert.match(manifest, /SECURITY_OAUTH2_ENABLED: "false"/);
  assert.match(manifest, /SECURITY_OAUTH2_DEBUGLOGGING: "false"/);
  assert.match(manifest, /license-gated/);
  assert.doesNotMatch(manifest, /^sso:/m);
});

test('Stirling-PDF declares complete metadata and local acceptance screenshots', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /license: "MIT with upstream proprietary component carve-outs"/);
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /platform-admin-toolkit-2\.14\.3\.png/);
  assert.match(manifest, /standard-user-toolkit-2\.14\.3\.png/);
});
