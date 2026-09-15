import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/prowlarr/youeye-app.yaml', import.meta.url), 'utf8');

test('Prowlarr 2.5.2.5491 uses the reviewed immutable LinuxServer OCI release', () => {
  assert.match(manifest, /^version: "2\.5\.2\.5491"$/m);
  assert.match(manifest, /docker\.io\/linuxserver\/prowlarr@sha256:2f3d31307beba3ba2dd226d191f5f5c14ee3b4d8b49277c64683f5ed97083179/);
  assert.doesNotMatch(manifest, /docker\.io\/linuxserver\/prowlarr:[^\s"]+/);
});

test('Prowlarr persists generated configuration and advertises its indexer service API key', () => {
  assert.match(manifest, /name: config\n        container: "\/config"\n        type: config/);
  assert.match(manifest, /container: "main"\n    path: "\/config\/config\.xml"/);
  assert.match(manifest, /^apiKey:\n  file: "\/config\/config\.xml"/m);
  assert.match(manifest, /pattern: "<ApiKey>\(\[\^<\]\+\)<\/ApiKey>"/);
  assert.match(manifest, /type: indexer/);
});

test('Prowlarr delegates interactive authentication to YouEye while retaining API-key auth', () => {
  assert.match(manifest, /^forwardAuth: enabled$/m);
  assert.match(manifest, /generator: "secretKey"/);
  assert.match(manifest, /<ApiKey>\$\{secrets\.api_key\}<\/ApiKey>/);
  assert.match(manifest, /<AuthenticationMethod>External<\/AuthenticationMethod>/);
  assert.match(manifest, /<AuthenticationRequired>Enabled<\/AuthenticationRequired>/);
  assert.doesNotMatch(manifest, /<AuthenticationMethod>None<\/AuthenticationMethod>/);
});

test('Prowlarr declares complete upstream and release detail', () => {
  for (const field of ['website', 'developer', 'license', 'sourceCode', 'support', 'docs', 'tagline', 'defaultSubdomain']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /iconUrl: "icon\.svg"/);
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /longDescription: \|/);
  assert.match(manifest, /screenshots\/platform-admin-public-domain-search-2\.5\.2\.5491\.png/);
  assert.match(manifest, /screenshots\/standard-profile-public-domain-search-2\.5\.2\.5491\.png/);
  assert.doesNotMatch(manifest, /^\s+- path: "https?:/m);
});
