import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const manifest = readFileSync(new URL('../apps/vaultwarden/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

const version = '1.37.1';
const image = 'docker.io/vaultwarden/server@sha256:ebdfe70701c60ac0c28c697e787cea767d7972940b786037b29fe0d507f821e8';

test('Vaultwarden version and OCI identity are synchronized and immutable', () => {
  assert.match(manifest, new RegExp(`^version: "${version.replaceAll('.', '\\.')}"$`, 'm'));
  assert.match(catalog, new RegExp(`^  - id: vaultwarden\\n(?:.*\\n){0,4}    latestVersion: "${version.replaceAll('.', '\\.')}"$`, 'm'));
  assert.match(manifest, new RegExp(`^    image: "${image.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}"$`, 'm'));
  assert.match(image, /@sha256:[0-9a-f]{64}$/);
});

test('Vaultwarden persistence remains inside its app-owned root', () => {
  assert.match(manifest, /^      - name: data$/m);
  assert.match(manifest, /^        container: "\/data"$/m);
  assert.match(manifest, /^  dropSharedDatabase: true$/m);
});

test('Vaultwarden retains its split-channel OIDC contract', () => {
  assert.match(manifest, /^  callback_path: \/identity\/connect\/oidc-signin$/m);
  assert.match(manifest, /^  SSO_AUTHORITY: "\$\{sso\.issuer\}"$/m);
  assert.match(manifest, /^  SSO_CLIENT_ID: "\$\{sso\.client_id\}"$/m);
  assert.match(manifest, /^  SSO_CLIENT_SECRET: "\$\{sso\.client_secret\}"$/m);
  assert.match(manifest, /^  SSO_PKCE: "true"$/m);
  assert.match(manifest, /^  SSO_SCOPES: "email profile"$/m);
  assert.match(manifest, /Vaultwarden adds the mandatory openid scope itself/);
  assert.match(manifest, /^  SSL_CERT_FILE: "\/etc\/ssl\/certs\/ca-certificates\.crt"$/m);
  assert.match(manifest, /^  REQUESTS_CA_BUNDLE: "\/etc\/ssl\/certs\/ca-certificates\.crt"$/m);
  assert.doesNotMatch(manifest, /NODE_TLS_REJECT_UNAUTHORIZED/);
});
