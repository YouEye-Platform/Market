import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/sonarr/youeye-app.yaml', import.meta.url), 'utf8');

test('Sonarr 4.0.20.3014 uses the reviewed immutable LinuxServer OCI release', () => {
  assert.match(manifest, /^version: "4\.0\.20\.3014"$/m);
  assert.match(manifest, /docker\.io\/linuxserver\/sonarr@sha256:c5a8178dc6d1f2e2c34b5e254716230d9769af34b4090e61cc116dc055a3083f/);
  assert.doesNotMatch(manifest, /docker\.io\/linuxserver\/sonarr:[^\s"]+/);
});

test('Sonarr persists generated configuration and shared media paths', () => {
  assert.match(manifest, /name: config\n        container: "\/config"\n        type: config/);
  assert.match(manifest, /container: "main"\n    path: "\/config\/config\.xml"/);
  assert.match(manifest, /container: "main"\n    path: "\/custom-cont-init\.d\/10-youeye-media-paths"/);
  assert.match(manifest, /storageGroup: media/);
  for (const path of ['/data/torrents', '/data/torrents/incomplete', '/data/media/tv', '/data/media/movies']) {
    assert.match(manifest, new RegExp(path.replaceAll('/', '\\/')));
  }
});

test('Sonarr delegates interactive authentication and retains API-key service wiring', () => {
  assert.match(manifest, /^forwardAuth: enabled$/m);
  assert.match(manifest, /generator: "secretKey"/);
  assert.match(manifest, /<ApiKey>\$\{secrets\.api_key\}<\/ApiKey>/);
  assert.match(manifest, /<AuthenticationMethod>External<\/AuthenticationMethod>/);
  assert.match(manifest, /pattern: "<ApiKey>\(\[\^<\]\+\)<\/ApiKey>"/);
  assert.match(manifest, /type: pvr/);
});

test('Sonarr keeps Prowlarr and qBittorrent integration contracts', () => {
  assert.match(manifest, /appId: prowlarr/);
  assert.match(manifest, /implementation: "Sonarr"/);
  assert.match(manifest, /appId: qbittorrent/);
  assert.match(manifest, /implementation: "QBittorrent"/);
  assert.match(manifest, /body: \{ path: "\/data\/media\/tv" \}/);
});

test('Sonarr declares complete upstream and release detail', () => {
  for (const field of ['website', 'developer', 'license', 'sourceCode', 'support', 'docs', 'tagline', 'defaultSubdomain']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /iconUrl: "icon\.svg"/);
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /longDescription: \|/);
  assert.match(manifest, /screenshots\/platform-admin-series-library-4\.0\.19\.2979\.png/);
  assert.match(manifest, /screenshots\/standard-profile-series-library-4\.0\.19\.2979\.png/);
  assert.doesNotMatch(manifest, /^\s+- path: "https?:/m);
});
