import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const manifest = readFileSync(new URL('../apps/nextcloud/youeye-app.yaml', import.meta.url), 'utf8');
const integration = readFileSync(new URL('../integrations/nextcloud/youeye-id.yaml', import.meta.url), 'utf8');
const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');

const version = '34.0.2';
const images = [
  'docker.io/valkey/valkey@sha256:a038175878d66b9d274fbf8be73c0305e93798b83917647f167e18cef3c71eec',
  'docker.io/library/nextcloud@sha256:3323e178371b1b0d03f9b3fdbe1831ff78335f07f25116d0d598048ce459e329',
];

test('Nextcloud version and OCI identities are synchronized and immutable', () => {
  assert.match(manifest, new RegExp(`^version: "${version.replaceAll('.', '\\.')}"$`, 'm'));
  assert.match(catalog, new RegExp(`^  - id: nextcloud\\n(?:.*\\n){0,4}    latestVersion: "${version.replaceAll('.', '\\.')}"$`, 'm'));

  const imageLines = [...manifest.matchAll(/^    image: "([^"]+)"$/gm)].map((match) => match[1]);
  assert.deepEqual(imageLines, images);
  for (const image of imageLines) {
    assert.match(image, /@sha256:[0-9a-f]{64}$/);
  }
});

test('Nextcloud persistence and URL configuration permit first-install bootstrap', () => {
  assert.match(manifest, /^      - name: html$/m);
  assert.match(manifest, /^        container: "\/var\/www\/html"$/m);
  assert.doesNotMatch(manifest, /^configFiles:$/m);
  assert.match(manifest, /^  NEXTCLOUD_TRUSTED_DOMAINS: "\$\{app\.fqdn\} localhost"$/m);
  assert.match(manifest, /^  OVERWRITEHOST: "\$\{app\.fqdn\}"$/m);
  assert.match(manifest, /^  OVERWRITECLIURL: "https:\/\/\$\{app\.fqdn\}"$/m);
  assert.match(manifest, /config:system:set trusted_domains 1 --value=''\$OVERWRITEHOST''/);
  assert.match(manifest, /config:system:set overwritehost --value=''\$OVERWRITEHOST''/);
  assert.match(manifest, /config:system:set overwrite\.cli\.url --value=''https:\/\/\$OVERWRITEHOST''/);
  assert.match(manifest, /valkey-cli FLUSHALL/);
  assert.match(manifest, /^  dropSharedDatabase: true$/m);
});

test('Nextcloud retains its native OIDC and administrator group contract', () => {
  assert.match(integration, /^  callback_path: \/apps\/user_oidc\/code$/m);
  assert.match(integration, /^  entry_url: \/apps\/user_oidc\/login\/1$/m);
  assert.match(integration, /^    type: groups$/m);
  assert.match(integration, /^    groupName: "admin"$/m);
  assert.match(integration, /--scope='openid email profile groups'/);
  assert.match(integration, /--mapping-groups=groups --group-provisioning=1/);
});
