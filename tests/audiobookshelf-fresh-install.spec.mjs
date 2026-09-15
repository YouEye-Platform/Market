import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/audiobookshelf/youeye-app.yaml', import.meta.url), 'utf8');
const identityIntegration = readFileSync(new URL('../integrations/audiobookshelf/youeye-id.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Audiobookshelf 2.36.0 uses the reviewed immutable official OCI release', () => {
  assert.match(manifest, /version: "2\.36\.0"/);
  assert.match(catalog, /id: audiobookshelf[\s\S]*?latestVersion: "2\.36\.0"/);
  assert.match(manifest, /docker\.io\/advplyr\/audiobookshelf@sha256:180acad33d69c99ed208676465d8edcb268fa46967735579a7810859885b1a8e/);
});

test('Audiobookshelf persists configuration, metadata, audiobooks, and podcasts', () => {
  for (const path of ['config', 'metadata', 'audiobooks', 'podcasts']) {
    assert.match(manifest, new RegExp(`name: ${path}`));
  }
  assert.match(manifest, /path: "\/healthcheck"/);
});

test('Audiobookshelf identity integration bootstraps its advertised root account without logging its secret', () => {
  assert.match(manifest, /name: "admin_password"/);
  assert.match(manifest, /username: "admin"[\s\S]*?passwordSecret: "admin_password"/);
  assert.match(identityIntegration, /version: "0\.1\.4"/);
  assert.match(identityIntegration, /version: "2\.36\.x"/);
  assert.match(identityIntegration, /url: "http:\/\/\$\{container\.ip\}:\$\{container\.port\}\/init"/);
  assert.match(identityIntegration, /password: "\$\{secrets\.admin_password\}"/);
});

test('Audiobookshelf uses the default native OIDC integration with local recovery login', () => {
  assert.match(identityIntegration, /installByDefault: true/);
  assert.match(identityIntegration, /callback_path: \/auth\/openid\/callback/);
  assert.match(identityIntegration, /authActiveAuthMethods:[\s\S]*?- "local"[\s\S]*?- "openid"/);
  assert.match(identityIntegration, /authOpenIDIssuerURL: "\$\{sso\.issuer\}"/);
  assert.match(identityIntegration, /authOpenIDTokenURL: "\$\{identity\.internalUrl\}\/application\/o\/token"/);
  assert.match(identityIntegration, /authOpenIDAutoRegister: true/);
  assert.match(identityIntegration, /authOpenIDMatchExistingBy: "email"/);
});

test('Audiobookshelf declares complete upstream and version detail', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /screenshots\/platform-admin-player-2\.36\.0\.png/);
  assert.match(manifest, /screenshots\/standard-user-player-2\.36\.0\.png/);
  assert.doesNotMatch(manifest, /^\s+- path: "https?:/m);
});
