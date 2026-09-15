import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const manifest = readFileSync(new URL('../apps/wikiless/youeye-app.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

test('Wikiless 0.1.3 uses reviewed immutable maintained OCI releases', () => {
  assert.match(manifest, /^version: "0\.1\.3"$/m);
  assert.match(catalog, /id: wikiless[\s\S]*?latestVersion: "0\.1\.3"/);
  assert.match(manifest, /ghcr\.io\/tiekoetter\/wikiless@sha256:c791def71a566e1ab7bc67c8cbfb5d5385036e1f5228ae4a6eba62d818245af3/);
  assert.match(manifest, /docker\.io\/valkey\/valkey@sha256:a038175878d66b9d274fbf8be73c0305e93798b83917647f167e18cef3c71eec/);
  assert.doesNotMatch(manifest, /ghcr\.io\/metastem/);
});

test('Wikiless keeps caches app-owned and exposes its dedicated health endpoint', () => {
  assert.match(manifest, /name: cache[\s\S]*?container: "\/data"/);
  assert.match(manifest, /name: media-cache[\s\S]*?container: "\/wikiless\/media"/);
  assert.match(manifest, /container: "\/wikiless\/media"/);
  assert.match(manifest, /path: "\/health"/);
  assert.match(manifest, /NONSSL_PORT: "8080"/);
});

test('Wikiless uses platform access control and its supported runtime configuration', () => {
  assert.match(manifest, /^forwardAuth: enabled$/m);
  assert.match(manifest, /REDIS_URL: "redis:\/\/\$\{containers\.redis\.internal_host\}:6379"/);
  assert.match(manifest, /DOMAIN: "\$\{app\.fqdn\}"/);
  assert.match(manifest, /DEFAULT_LANG: "en"/);
  assert.match(manifest, /THEME: "dark"/);
  assert.match(manifest, /wikimedia_useragent: "Wikiless\/0\.1\.3/);
});

test('Wikiless declares its maintained upstream and complete release detail', () => {
  assert.match(manifest, /sourceCode: "https:\/\/github\.com\/tiekoetter\/Wikiless"/);
  assert.match(manifest, /website: "https:\/\/wikiless\.tiekoetter\.com"/);
  assert.match(manifest, /license: "AGPL-3\.0-only"/);
  for (const field of ['website', 'developer', 'license', 'sourceCode', 'support', 'docs', 'tagline', 'defaultSubdomain']) {
    assert.match(manifest, new RegExp(`^  ${field}:`, 'm'));
  }
  assert.match(manifest, /iconUrl: "icon\.png"/);
  assert.match(manifest, /releaseNotes: \|/);
  assert.match(manifest, /longDescription: \|/);
});

test('Wikiless includes inspected local administrator and standard-user acceptance assets', () => {
  assert.match(manifest, /path: "screenshots\/platform-admin-article-0\.1\.3\.png"/);
  assert.match(manifest, /path: "screenshots\/standard-user-article-0\.1\.3\.png"/);
  assert.doesNotMatch(manifest, /^\s+- path: "https?:/m);
});
