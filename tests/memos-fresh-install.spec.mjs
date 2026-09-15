import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/memos/youeye-app.yaml', import.meta.url), 'utf8');
const integration = readFileSync(new URL('../integrations/memos/youeye-id.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Memos version and immutable OCI identity are synchronized', () => {
  assert.match(manifest, /^version: "0\.30\.0"$/m);
  assert.match(catalog, /id: memos[\s\S]*?latestVersion: "0\.30\.0"/);
  assert.match(manifest, /docker\.io\/neosmemo\/memos@sha256:71a5b4738d1bed96e92112004054f0888e92791b64eb78afd79077c96e6f9327/);
});

test('Memos retains app-owned data and shared PostgreSQL', () => {
  assert.match(manifest, /database:\n  mode: shared\n  name: "memos"\n  user: "memos"/);
  assert.match(manifest, /name: data[\s\S]*?container: "\/var\/opt\/memos"/);
  assert.match(manifest, /container: "\/var\/opt\/memos"/);
  assert.match(manifest, /MEMOS_DSN: "\$\{database\.dsn\}"/);
  assert.match(manifest, /MEMOS_INSTANCE_URL: "\$\{app\.url\}"/);
  assert.match(manifest, /dropSharedDatabase: true/);
});

test('Memos identity integration targets the accepted API generation', () => {
  assert.match(integration, /^version: "0\.1\.5"$/m);
  assert.match(integration, /^  version: "0\.30\.x"$/m);
  assert.match(integration, /callback_path: \/auth\/callback/);
  assert.match(integration, /\/api\/v1\/identity-providers/);
  assert.match(integration, /identifier: "preferred_username"/);
});

test('Memos declares complete upstream and presentation metadata', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /^  releaseNotes: \|$/m);
  assert.match(manifest, /^  longDescription: \|$/m);
  assert.match(manifest, /path: "screenshots\/platform-admin-memos\.png"/);
  assert.match(manifest, /path: "screenshots\/standard-user-memos\.png"/);
});
