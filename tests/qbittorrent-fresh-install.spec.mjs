import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/qbittorrent/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('qBittorrent 5.2.3 uses the reviewed immutable LinuxServer OCI release', () => {
  assert.match(manifest, /version: "5\.2\.3"/);
  assert.match(catalog, /id: qbittorrent[\s\S]*?latestVersion: "5\.2\.3"/);
  assert.match(manifest, /docker\.io\/linuxserver\/qbittorrent@sha256:6816d2b144b1eb97665f886e41e18a14d026ba78c9d0953fc68a1211ea819433/);
});

test('qBittorrent persists configuration and uses the shared media storage group', () => {
  assert.match(manifest, /name: config\n        container: "\/config"\n        type: config/);
  assert.match(manifest, /container: "\/data"[\s\S]*?type: media[\s\S]*?storageGroup: media/);
  assert.match(manifest, /container: "main"\n    path: "\/custom-cont-init\.d\/10-youeye-webui-credential"/);
  assert.match(manifest, /path: "\/"/);
  assert.match(manifest, /type: download-client[\s\S]*?port: 8080/);
});

test('qBittorrent bootstraps the advertised credential without a plaintext or logged temporary password', () => {
  assert.match(manifest, /name: "admin_password"/);
  assert.match(manifest, /username: "admin"[\s\S]*?passwordSecret: "admin_password"/);
  assert.match(manifest, /YOUEYE_QBITTORRENT_PASSWORD: "\$\{secrets\.admin_password\}"/);
  assert.match(manifest, /hashlib\.pbkdf2_hmac\("sha512", password\.encode\(\), salt, 100000, 64\)/);
  assert.match(manifest, /WebUI\\\\Password_PBKDF2=/);
  assert.match(manifest, /WebUI\\LocalHostAuth=true/);
  assert.doesNotMatch(manifest, /password is printed|temporary password/i);
});

test('qBittorrent prepares the canonical shared download and media directories', () => {
  for (const path of ['/data/torrents', '/data/torrents/incomplete', '/data/media/tv', '/data/media/movies']) {
    assert.ok(manifest.includes(`Path("${path}")`), `missing bootstrap path ${path}`);
  }
  assert.match(manifest, /Session\\DefaultSavePath=\/data\/torrents\//);
  assert.match(manifest, /Session\\TempPath=\/data\/torrents\/incomplete\//);
});

test('qBittorrent declares complete upstream and release detail', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /screenshots\/platform-admin-completed-download-5\.2\.3\.png/);
  assert.match(manifest, /screenshots\/standard-profile-completed-download-5\.2\.3\.png/);
  assert.doesNotMatch(manifest, /^\s+- path: "https?:/m);
});
