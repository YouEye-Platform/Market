import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/paperless-ngx/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Paperless-NGX 3.0.5 uses reviewed immutable upstream OCI releases', () => {
  assert.match(manifest, /version: "3\.0\.5"/);
  assert.match(catalog, /id: paperless-ngx[\s\S]*?latestVersion: "3\.0\.5"/);
  assert.match(manifest, /ghcr\.io\/paperless-ngx\/paperless-ngx@sha256:65a4cabf0169ea7fbd90ab7bb28ba3f8b5909613635acda1a03ad606f34b456b/);
  assert.match(manifest, /docker\.io\/valkey\/valkey@sha256:ee91f7a174ac4d6a6b0685b3a60e321f0a9dbbb691f9b0e285be2ba1d1be8328/);
});

test('Paperless-NGX persists every supported document and queue-data path', () => {
  for (const path of ['/data', '/usr/src/paperless/data', '/usr/src/paperless/media', '/usr/src/paperless/consume', '/usr/src/paperless/export']) {
    assert.match(manifest, new RegExp(`container: "${path}"`));
  }
  assert.match(manifest, /name: valkey-data[\s\S]*?container: "\/data"/);
  assert.match(manifest, /path: "\/"/);
});

test('Paperless-NGX uses the platform-provided shared PostgreSQL endpoint', () => {
  assert.match(manifest, /PAPERLESS_DBHOST: "\$\{database\.host\}"/);
  assert.match(manifest, /PAPERLESS_DBNAME: "\$\{database\.name\}"/);
  assert.match(manifest, /PAPERLESS_DBUSER: "\$\{database\.user\}"/);
  assert.match(manifest, /PAPERLESS_DBPASS: "\$\{database\.password\}"/);
  assert.doesNotMatch(manifest, /youeye-postgres\.youeye/);
});

test('Paperless-NGX uses the v3 consumer and native OIDC contracts', () => {
  assert.match(manifest, /PAPERLESS_CONSUMER_POLLING_INTERVAL: "30"/);
  assert.doesNotMatch(manifest, /PAPERLESS_CONSUMER_POLLING:/);
  assert.match(manifest, /PAPERLESS_APPS: "allauth\.socialaccount\.providers\.openid_connect"/);
  assert.match(manifest, /token_auth_method\\?"?:\\?"client_secret_basic/);
  assert.match(manifest, /PAPERLESS_SOCIAL_AUTO_SIGNUP: "true"/);
  assert.match(manifest, /PAPERLESS_SOCIALACCOUNT_ALLOW_SIGNUPS: "true"/);
  assert.match(manifest, /PAPERLESS_DISABLE_REGULAR_LOGIN: "false"/);
  assert.match(manifest, /PAPERLESS_REDIRECT_LOGIN_TO_SSO: "false"/);
});

test('Paperless-NGX exposes its generated bootstrap admin and platform SMTP relay', () => {
  assert.match(manifest, /username: "admin"/);
  assert.match(manifest, /PAPERLESS_ADMIN_PASSWORD: "\$\{secrets\.admin_password\}"/);
  for (const name of ['HOST', 'PORT', 'HOST_USER', 'HOST_PASSWORD', 'FROM', 'USE_TLS']) {
    assert.match(manifest, new RegExp(`PAPERLESS_EMAIL_${name}:`));
  }
});

test('Paperless-NGX declares complete metadata and version detail', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /platform-admin-document-3\.0\.5\.png/);
  assert.match(manifest, /standard-user-document-3\.0\.5\.png/);
});
