import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/hedgedoc/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('HedgeDoc version and official immutable OCI identity are synchronized', () => {
  assert.match(manifest, /^version: "1\.12\.0"$/m);
  assert.match(catalog, /id: hedgedoc[\s\S]*?latestVersion: "1\.12\.0"/);
  assert.match(manifest, /quay\.io\/hedgedoc\/hedgedoc@sha256:5aff8d48f1d64a36e21e442216513a9d6bed02bad8dcf9a37f303c76356a727a/);
  assert.doesNotMatch(manifest, /linuxserver\/hedgedoc/);
});

test('HedgeDoc retains shared PostgreSQL and official upload persistence', () => {
  assert.match(manifest, /database:\n  mode: shared\n  name: "hedgedoc"\n  user: "hedgedoc"/);
  assert.match(manifest, /name: uploads[\s\S]*?container: "\/hedgedoc\/public\/uploads"/);
  assert.match(manifest, /dropSharedDatabase: true/);
});

test('HedgeDoc preserves split-channel OAuth and stable user identity', () => {
  assert.match(manifest, /CMD_OAUTH2_AUTHORIZATION_URL: "\$\{identity\.externalUrl\}\/application\/o\/authorize\/"/);
  assert.match(manifest, /CMD_OAUTH2_TOKEN_URL: "\$\{identity\.internalUrl\}\/application\/o\/token"/);
  assert.match(manifest, /CMD_OAUTH2_USER_PROFILE_URL: "\$\{identity\.internalUrl\}\/application\/o\/userinfo"/);
  assert.match(manifest, /CMD_OAUTH2_USER_PROFILE_ID_ATTR: "sub"/);
});

test('HedgeDoc declares complete upstream and presentation metadata', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /^  releaseNotes: \|$/m);
  assert.match(manifest, /^  longDescription: \|$/m);
  assert.match(manifest, /path: "screenshots\/platform-admin-note-1\.11\.1\.png"/);
  assert.match(manifest, /path: "screenshots\/standard-user-note-1\.11\.1\.png"/);
});
