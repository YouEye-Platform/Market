import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/jellyfin/youeye-app.yaml', import.meta.url), 'utf8');
const identityIntegration = readFileSync(new URL('../integrations/jellyfin/youeye-id.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Jellyfin 10.11.11 uses the reviewed immutable official OCI release', () => {
  assert.match(manifest, /version: "10\.11\.11"/);
  assert.match(catalog, /id: jellyfin[\s\S]*?latestVersion: "10\.11\.11"/);
  assert.match(manifest, /docker\.io\/jellyfin\/jellyfin@sha256:aefb67e6a7ff1debdd154a78a7bbb780fd0c873d8639210a7f6a2016ad2b35db/);
});

test('Jellyfin persists configuration, cache, and the shared media library', () => {
  for (const path of ['config', 'cache', 'data']) {
    assert.match(manifest, new RegExp(`name: ${path}`));
  }
  assert.match(manifest, /container: "\/data"[\s\S]*?type: media[\s\S]*?storageGroup: media/);
  assert.match(manifest, /path: "\/health"/);
});

test('Jellyfin default identity integration bootstraps the advertised recovery administrator', () => {
  assert.match(manifest, /name: "admin_password"/);
  assert.match(manifest, /username: "admin"[\s\S]*?passwordSecret: "admin_password"/);
  assert.match(identityIntegration, /installByDefault: true/);
  assert.match(identityIntegration, /version: "10\.11\.x"/);
  assert.match(identityIntegration, /url: "http:\/\/\$\{container\.ip\}:\$\{container\.port\}\/Startup\/User"/);
  assert.match(identityIntegration, /Name: "admin"[\s\S]*?password: "\$\{secrets\.admin_password\}"/);
  assert.match(identityIntegration, /Username: "admin"[\s\S]*?Pw: "\$\{secrets\.admin_password\}"/);
});

test('Jellyfin identity integration configures SSO with local recovery intact', () => {
  assert.match(identityIntegration, /Packages\/Installed\/SSO%20Authentication/);
  assert.match(identityIntegration, /callback_path: \/sso\/OID\/redirect\/\$\{sso\.slug\}/);
  assert.match(identityIntegration, /entry_url: \/sso\/OID\/start\/\$\{sso\.slug\}/);
  assert.match(identityIntegration, /oidEndpoint: "\$\{sso\.issuer\}"/);
  assert.match(identityIntegration, /defaultUsernameClaim: "preferred_username"/);
  assert.match(identityIntegration, /disableHttps: true/);
  assert.match(identityIntegration, /doNotValidateEndpoints: true/);
  assert.match(identityIntegration, /doNotValidateIssuerName: true/);
});

test('Jellyfin declares complete upstream and version detail', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /screenshots\/platform-admin-player-10\.11\.11\.png/);
  assert.match(manifest, /screenshots\/standard-user-player-10\.11\.11\.png/);
  assert.doesNotMatch(manifest, /^\s+- path: "https?:/m);
});
