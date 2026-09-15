import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/mealie/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Mealie 3.22.0 uses the official immutable OCI release', () => {
  assert.match(manifest, /version: "3\.22\.0"/);
  assert.match(catalog, /id: mealie[\s\S]*?latestVersion: "3\.22\.0"/);
  assert.match(manifest, /ghcr\.io\/mealie-recipes\/mealie@sha256:36c28f0642fb6c75fae8997a2d55994631b9b4bcffba3016c208fc132a4c1e69/);
});

test('Mealie retains app-owned persistence, native OIDC, and SMTP', () => {
  assert.match(manifest, /container: "\/app\/data"/);
  assert.match(manifest, /OIDC_CONFIGURATION_URL: "\$\{sso\.discovery_url\}"/);
  assert.match(manifest, /OIDC_SIGNUP_ENABLED: "true"/);
  assert.match(manifest, /OIDC_ADMIN_GROUP: "admin"/);
  assert.match(manifest, /SMTP_HOST: "\$\{smtp\.host\}"/);
});

test('Mealie declares complete metadata and local acceptance screenshots', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  assert.match(manifest, /license: "AGPL-3\.0"/);
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /screenshots\/platform-admin-recipes-3\.22\.0\.png/);
  assert.match(manifest, /screenshots\/standard-user-recipes-3\.22\.0\.png/);
});
