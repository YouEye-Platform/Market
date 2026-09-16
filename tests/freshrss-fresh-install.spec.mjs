import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/freshrss/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('FreshRSS version and immutable OCI identity are synchronized', () => {
  assert.match(manifest, /^version: "1\.29\.1"$/m);
  assert.match(catalog, /id: freshrss[\s\S]*?latestVersion: "1\.29\.1"/);
  assert.match(manifest, /docker\.io\/freshrss\/freshrss@sha256:ab6b363102ccdbc39f6a62db926f567c61a5289bf25ba460f1c34423d8cc1a4d/);
  assert.doesNotMatch(manifest, /^\s+image:.*:[^/\s"']+\s*$/m);
});

test('FreshRSS keeps data, extensions, and generated configuration in app-owned volumes', () => {
  assert.match(manifest, /name: data\n        container: "\/var\/www\/FreshRSS\/data"\n        type: data/);
  assert.match(manifest, /name: extensions\n        container: "\/var\/www\/FreshRSS\/extensions"\n        type: data/);
  assert.match(manifest, /name: apache-runtime\n        container: "\/run"\n        type: config/);
  assert.match(manifest, /container: "main"\n    path: "\/run\/apache2\/\.keep"/);
});

test('FreshRSS OIDC uses HTTP auth with automatic standard-user registration', () => {
  assert.match(manifest, /FRESHRSS_INSTALL: .*--auth-type http_auth/);
  assert.match(manifest, /OIDC_ENABLED: "1"/);
  assert.match(manifest, /OIDC_REMOTE_USER_CLAIM: "preferred_username"/);
  assert.match(manifest, /OIDC_SCOPES: "openid email profile"/);
  assert.match(manifest, /OIDC_X_FORWARDED_HEADERS: "X-Forwarded-Host X-Forwarded-Port X-Forwarded-Proto"/);
  assert.match(manifest, /container: "main"\n    path: "\/var\/www\/FreshRSS\/data\/config-user\.custom\.php"/);
  assert.match(manifest, /'is_admin' => \$new_user_name === 'admin'/);
});

test('FreshRSS declares complete upstream and presentation metadata', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /^  releaseNotes: \|$/m);
  assert.match(manifest, /^  longDescription: \|$/m);
});
