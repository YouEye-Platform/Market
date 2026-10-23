import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/navidrome/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Navidrome 0.64.2 uses the reviewed immutable official OCI release', () => {
  assert.match(manifest, /version: "0\.64\.2"/);
  assert.match(catalog, /id: navidrome[\s\S]*?latestVersion: "0\.64\.2"/);
  assert.match(manifest, /docker\.io\/navidrome\/navidrome@sha256:59ce76e6e06193fbfbb1736a93b8468227e1ea663fc7b25b1da13fbb97f5197b/);
});

test('Navidrome persists its database and music library under the app-owned root', () => {
  assert.match(manifest, /name: data[\s\S]*?container: "\/data"/);
  assert.match(manifest, /name: music[\s\S]*?container: "\/music"/);
  assert.match(manifest, /path: "\/ping"/);
});

test('Navidrome uses the current external-auth contract behind platform forward-auth', () => {
  assert.match(manifest, /^forwardAuth: enabled$/m);
  assert.match(manifest, /ND_EXTAUTH_USERHEADER: "X-YouEye-Username"/);
  assert.match(manifest, /ND_EXTAUTH_TRUSTEDSOURCES: "10\.76\.0\.0\/16"/);
  assert.doesNotMatch(manifest, /ND_REVERSEPROXY/);
  assert.doesNotMatch(manifest, /^sso:/m);
  assert.doesNotMatch(manifest, /^credentials:/m);
  assert.match(manifest, /ND_ENABLESHARING: "false"/);
});

test('Navidrome declares complete upstream and version detail', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /screenshots\/platform-admin-library-0\.63\.2\.png/);
  assert.match(manifest, /screenshots\/standard-user-player-0\.63\.2\.png/);
  assert.doesNotMatch(manifest, /^\s+- path: "https?:/m);
});
