import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const manifest = readFileSync(new URL('../apps/wallabag/youeye-app.yaml', import.meta.url), 'utf8');

test('wallabag uses the official immutable 2.6.14 OCI image', () => {
  assert.match(manifest, /version: "2\.6\.14"/);
  assert.match(manifest, /docker\.io\/wallabag\/wallabag@sha256:4a527e027e0d59e87c14225ef11e005af3d4890374202ad319ce5e63dfc66709/);
});
test('wallabag keeps app data, images, SMTP, and explicit local-login semantics', () => {
  assert.match(manifest, /container: "\/var\/www\/wallabag\/data"/);
  assert.match(manifest, /container: "\/var\/www\/wallabag\/web\/assets\/images"/);
  assert.match(manifest, /SYMFONY__ENV__MAILER_DSN:/);
  assert.match(manifest, /NO external OIDC\/SAML login/);
  assert.match(manifest, /YOUEYE_ADMIN_PASSWORD: "\$\{secrets\.admin_password\}"/);
  assert.match(manifest, /fos:user:change-password wallabag/);
  assert.match(manifest, /exec \/entrypoint\.sh wallabag/);
  assert.match(manifest, /sleep 45; until php/);
  assert.doesNotMatch(manifest, /postDeploy:/);
});
test('wallabag declares complete metadata and local screenshots', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  assert.match(manifest, /license: "MIT"/);
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /platform-admin-library-2\.6\.14\.png/);
  assert.match(manifest, /standard-user-library-2\.6\.14\.png/);
});
