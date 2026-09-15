import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/vikunja/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Vikunja version and immutable OCI identity are synchronized', () => {
  assert.match(manifest, /^version: "2\.5\.0"$/m);
  assert.match(catalog, /id: vikunja[\s\S]*?latestVersion: "2\.5\.0"/);
  assert.match(manifest, /docker\.io\/vikunja\/vikunja@sha256:22df4c1bc8843c28d383bc5f52b59e7b601bf5f6560b36b29c0a500833c77fa3/);
});

test('Vikunja retains app-owned persistence and native OIDC', () => {
  assert.match(manifest, /name: data[\s\S]*?container: "\/app\/vikunja\/files"/);
  assert.match(manifest, /name: db[\s\S]*?container: "\/db"/);
  assert.match(manifest, /VIKUNJA_AUTH_OPENID_ENABLED: "true"/);
  assert.match(manifest, /VIKUNJA_AUTH_OPENID_PROVIDERS_AUTHENTIK_NAME: "\$\{identity\.name\}"/);
  assert.match(manifest, /VIKUNJA_AUTH_OPENID_PROVIDERS_AUTHENTIK_AUTHURL: "\$\{sso\.issuer\}"/);
  assert.doesNotMatch(manifest, /VIKUNJA_AUTH_OPENID_PROVIDERS__0__/);
  assert.match(manifest, /callback_path: \/auth\/openid\/authentik/);
});

test('Vikunja declares complete upstream and presentation metadata', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /^  releaseNotes: \|$/m);
  assert.match(manifest, /^  longDescription: \|$/m);
  assert.match(manifest, /path: "screenshots\/platform-admin-project\.png"/);
  assert.match(manifest, /path: "screenshots\/standard-user-project\.png"/);
});
