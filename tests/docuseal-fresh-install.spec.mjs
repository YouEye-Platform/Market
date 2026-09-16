import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/docuseal/youeye-app.yaml', import.meta.url), 'utf8');

test('DocuSeal 3.2.0 uses the official immutable OCI release', () => {
  assert.match(manifest, /version: "3\.2\.0"/);
  assert.match(manifest, /docker\.io\/docuseal\/docuseal@sha256:50ed54743542a86c7bb97bea06fbddae619cbd3273df9589af44cac318f0f774/);
});

test('DocuSeal persists application state and keeps its local-login contract explicit', () => {
  assert.match(manifest, /container: "\/data"/);
  assert.match(manifest, /path: "\/up"/);
  assert.match(manifest, /SECRET_KEY_BASE: "\$\{secrets\.secret_key\}"/);
  assert.match(manifest, /SMTP_FROM: "\$\{smtp\.from\}"/);
  assert.match(manifest, /NO external/);
  assert.match(manifest, /only the administrator role/);
});

test('DocuSeal declares complete metadata and local acceptance screenshots', () => {
  for (const field of ['developer', 'license', 'sourceCode', 'support', 'docs', 'tagline']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /license: "AGPL-3\.0-only"/);
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /platform-admin-template-3\.2\.0\.png/);
  assert.match(manifest, /standard-user-signing-3\.2\.0\.png/);
});
