import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/linkwarden/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Linkwarden version and official immutable OCI identity are synchronized', () => {
  assert.match(manifest, /version: "2\.16\.0"/);
  assert.match(catalog, /id: linkwarden[\s\S]*?latestVersion: "2\.16\.0"/);
  assert.match(manifest, /ghcr\.io\/linkwarden\/linkwarden@sha256:d805877fb707d160b809027c302f84cfba11a248d7fdc12de90b4791f98e6b55/);
  assert.doesNotMatch(manifest, /linkwarden:v2\.16\.0/);
});

test('Linkwarden retains shared PostgreSQL and persistent archive storage', () => {
  assert.match(manifest, /database:\n  mode: shared\n  name: "linkwarden"\n  user: "linkwarden"/);
  assert.match(manifest, /name: data[\s\S]*?container: "\/data\/data"/);
  assert.match(manifest, /dropSharedDatabase: true/);
  assert.match(manifest, /healthCheck:\n      type: "http"\n      path: "\/"/);
  assert.doesNotMatch(manifest, /path: "\/api\/v1\/health"/);
});

test('Linkwarden uses native platform SSO with the required NextAuth base path', () => {
  assert.match(manifest, /callback_path: \/api\/v1\/auth\/callback\/authentik/);
  assert.match(manifest, /NEXTAUTH_URL: "\$\{app\.url\}\/api\/v1\/auth"/);
  assert.match(manifest, /AUTHENTIK_ISSUER: "\$\{identity\.internalUrl\}\/application\/o\/youeye-app-\$\{app\.id\}"/);
  assert.match(manifest, /NEXT_PUBLIC_CREDENTIALS_ENABLED: "false"/);
  assert.match(manifest, /NEXT_PUBLIC_DISABLE_REGISTRATION: "true"/);
});

test('Linkwarden declares complete upstream and presentation metadata', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /license: "AGPL-3\.0"/);
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /screenshots\/platform-admin-library-2\.16\.0\.png/);
  assert.match(manifest, /screenshots\/standard-user-library-2\.16\.0\.png/);
});
