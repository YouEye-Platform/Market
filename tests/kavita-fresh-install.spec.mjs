import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/kavita/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Kavita 0.9.0.2 and its gateway use reviewed immutable official OCI releases', () => {
  assert.match(manifest, /version: "0\.9\.0\.2"/);
  assert.match(catalog, /id: kavita[\s\S]*?latestVersion: "0\.9\.0\.2"/);
  assert.match(manifest, /docker\.io\/jvmilazz0\/kavita@sha256:ca6af7a18d7124d014702983c2364e485294f808c1552e9555f2595b7cda7982/);
  assert.match(manifest, /docker\.io\/library\/caddy@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648/);
});

test('Kavita persists configuration and routes generated files to their owning containers', () => {
  assert.match(manifest, /name: config\n        container: "\/kavita\/config"\n        type: config/);
  assert.match(manifest, /name: library\n        container: "\/manga"\n        type: media/);
  assert.match(manifest, /name: gateway-config\n        container: "\/etc\/caddy"\n        type: config/);
  assert.match(manifest, /container: "main"\n    path: "\/etc\/caddy\/Caddyfile"/);
  assert.match(manifest, /container: "kavita"\n    path: "\/kavita\/config\/youeye-entrypoint\.sh"/);
  assert.match(manifest, /path: "\/api\/health"/);
});

test('Kavita starts before its primary gateway and the gateway health checks the proxied app', () => {
  const kavitaContainer = manifest.indexOf('- name: "kavita"');
  const gatewayContainer = manifest.indexOf('- name: "main"');
  assert.ok(kavitaContainer >= 0);
  assert.ok(gatewayContainer > kavitaContainer);
  assert.match(
    manifest.slice(gatewayContainer),
    /primary: true[\s\S]*?environment:[\s\S]*?YOUEYE_KAVITA_HOST: "\$\{containers\.kavita\.internal_host\}"[\s\S]*?healthCheck:[\s\S]*?path: "\/api\/health"/,
  );
  const globalMappings = manifest.match(/env_mapping:\n([\s\S]*?)\nconfigFiles:/)?.[1] ?? '';
  assert.doesNotMatch(globalMappings, /\$\{containers\.kavita\.internal_host\}/);
});

test('Kavita uses its supported OIDC callback and disk-backed configuration contract', () => {
  assert.match(manifest, /callback_path: \/signin-oidc/);
  assert.match(manifest, /\$\{install\.url\}\/signin-oidc/);
  assert.match(manifest, /YOUEYE_OIDC_AUTHORITY: "\$\{app\.url\}\/youeye-oidc\/"/);
  assert.match(manifest, /YOUEYE_OIDC_ISSUER: "\$\{sso\.issuer\}"/);
  assert.match(manifest, /YOUEYE_KAVITA_HOST: "\$\{containers\.kavita\.internal_host\}"/);
  assert.match(manifest, /\/youeye-oidc\/\.well-known\/openid-configuration/);
  assert.match(manifest, /@oidc_metadata path \/youeye-oidc\/\.well-known\/openid-configuration/);
  assert.match(manifest, /token_endpoint.*YOUEYE_IDENTITY_EXTERNAL_URL/);
  assert.match(manifest, /jwks_uri.*YOUEYE_IDENTITY_EXTERNAL_URL/);
  assert.match(manifest, /OpenIdConnectSettings/);
  assert.match(manifest, /\/kavita\/config\/appsettings\.json/);
  assert.doesNotMatch(manifest, /OpenIdConnectSettings__/);
  assert.doesNotMatch(manifest, /YOUEYE_OIDC_AUTHORITY: "\$\{sso\.issuer\}"/);
});

test('Kavita advertises and bootstraps a generated local administrator without logging its secret', () => {
  assert.match(manifest, /name: "admin_password"/);
  assert.match(manifest, /username: "admin"[\s\S]*?passwordSecret: "admin_password"/);
  assert.match(manifest, /YOUEYE_ADMIN_PASSWORD: "\$\{secrets\.admin_password\}"/);
  assert.match(manifest, /\/api\/Account\/register/);
  assert.match(manifest, /--output \/dev\/null --write-out '%\{http_code\}'/);
  assert.doesNotMatch(manifest, /echo .*YOUEYE_ADMIN_PASSWORD/);
});

test('Kavita declares complete upstream and version detail', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /screenshots\/platform-admin-reader-0\.9\.0\.2\.png/);
  assert.match(manifest, /screenshots\/standard-user-reader-0\.9\.0\.2\.png/);
  assert.doesNotMatch(manifest, /^\s+- path: "https?:/m);
});
