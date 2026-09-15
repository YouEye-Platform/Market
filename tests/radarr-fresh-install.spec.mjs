import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/radarr/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Radarr 6.3.0.10514 uses the reviewed immutable LinuxServer OCI release', () => {
  assert.match(manifest, /^version: "6\.3\.0\.10514"$/m);
  assert.match(catalog, /id: radarr[\s\S]*?latestVersion: "6\.3\.0\.10514"/);
  assert.match(manifest, /docker\.io\/linuxserver\/radarr@sha256:a45b5ab0f850f39edb4cc9c95bbd967b52ddc3d4574a4dfb45561177db6c88f4/);
  assert.doesNotMatch(manifest, /docker\.io\/linuxserver\/radarr:[^\s"]+/);
});

test('Radarr persists generated configuration and shared media paths', () => {
  assert.match(manifest, /name: config\n        container: "\/config"\n        type: config/);
  assert.match(manifest, /container: "main"\n    path: "\/config\/config\.xml"/);
  assert.match(manifest, /container: "main"\n    path: "\/custom-cont-init\.d\/10-youeye-media-paths"/);
  assert.match(manifest, /storageGroup: media/);
  for (const path of ['/data/torrents', '/data/torrents/incomplete', '/data/media/tv', '/data/media/movies']) {
    assert.match(manifest, new RegExp(path.replaceAll('/', '\\/')));
  }
});

test('Radarr delegates interactive authentication and retains API-key service wiring', () => {
  assert.match(manifest, /^forwardAuth: enabled$/m);
  assert.match(manifest, /generator: "secretKey"/);
  assert.match(manifest, /<ApiKey>\$\{secrets\.api_key\}<\/ApiKey>/);
  assert.match(manifest, /<AuthenticationMethod>External<\/AuthenticationMethod>/);
  assert.match(manifest, /<AuthenticationRequired>Enabled<\/AuthenticationRequired>/);
  assert.match(manifest, /pattern: "<ApiKey>\(\[\^<\]\+\)<\/ApiKey>"/);
  assert.match(manifest, /type: pvr/);
});

test('Radarr keeps Prowlarr and qBittorrent integration contracts', () => {
  assert.match(manifest, /appId: prowlarr/);
  assert.match(manifest, /implementation: "Radarr"/);
  assert.match(manifest, /appId: qbittorrent/);
  assert.match(manifest, /implementation: "QBittorrent"/);
  assert.match(manifest, /body: \{ path: "\/data\/media\/movies" \}/);
});

test('Radarr declares complete upstream and release detail', () => {
  for (const field of ['website', 'developer', 'license', 'sourceCode', 'support', 'docs', 'tagline', 'defaultSubdomain']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /iconUrl: "icon\.png"/);
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /longDescription: \|/);
  assert.match(manifest, /screenshots\/platform-admin-public-domain-movie-6\.3\.0\.10514\.png/);
  assert.match(manifest, /screenshots\/standard-profile-public-domain-movie-6\.3\.0\.10514\.png/);
  assert.doesNotMatch(manifest, /^\s+- path: "https?:/m);
});
