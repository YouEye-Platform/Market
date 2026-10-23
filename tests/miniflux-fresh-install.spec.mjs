import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/miniflux/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Miniflux version and immutable OCI identity are synchronized', () => {
  assert.match(manifest, /^version: "2\.3\.4"$/m);
  assert.match(catalog, /id: miniflux[\s\S]*?latestVersion: "2\.3\.4"/);
  assert.match(manifest, /docker\.io\/miniflux\/miniflux@sha256:ef6cf5a911b7276225d8e0e7a1077013a202b1d6a019526aaa250ad06942cbbc/);
});

test('Miniflux retains shared PostgreSQL and app bootstrap contracts', () => {
  assert.match(manifest, /database:\n  mode: shared\n  name: "miniflux"\n  user: "miniflux"/);
  assert.match(manifest, /DATABASE_URL: "\$\{database\.dsn\}"/);
  assert.match(manifest, /RUN_MIGRATIONS: "1"/);
  assert.match(manifest, /CREATE_ADMIN: "1"/);
  assert.match(manifest, /ADMIN_PASSWORD: "\$\{secrets\.admin_password\}"/);
  assert.match(manifest, /dropSharedDatabase: true/);
});

test('Miniflux retains native OIDC auto-provisioning', () => {
  assert.match(manifest, /OAUTH2_PROVIDER: "oidc"/);
  assert.match(manifest, /OAUTH2_OIDC_DISCOVERY_ENDPOINT: "\$\{sso\.issuer\}"/);
  assert.doesNotMatch(manifest, /OAUTH2_OIDC_DISCOVERY_ENDPOINT: "\$\{sso\.discovery_url\}"/);
  assert.match(manifest, /OAUTH2_USER_CREATION: "1"/);
  assert.match(manifest, /callback_path: \/oauth2\/oidc\/callback/);
});

test('Miniflux declares complete upstream and presentation metadata', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /^  releaseNotes: \|$/m);
  assert.match(manifest, /^  longDescription: \|$/m);
  assert.match(manifest, /path: "screenshots\/platform-admin-feed\.png"/);
  assert.match(manifest, /path: "screenshots\/standard-user-subscriptions\.png"/);
});
