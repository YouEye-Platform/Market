import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

test('all Market apps use logical Incus volume declarations', () => {
  for (const appId of readdirSync(path.join(root, 'apps'))) {
    const manifestPath = path.join(root, 'apps', appId, 'youeye-app.yaml');
    const manifest = readFileSync(manifestPath, 'utf8');
    assert.doesNotMatch(manifest, /^\s+host:/m, `${appId} still declares a host bind path`);
    assert.doesNotMatch(manifest, /\/var\/lib\/youeye\/app-\$\{app\.id\}/, `${appId} still embeds the retired app-data root`);
    for (const volume of manifest.matchAll(/^\s+- name: ([a-z0-9-]+)\n\s+container: ("[^\n]+")\n\s+type: (config|data|media|cache)$/gm)) {
      assert.ok(volume[1]);
      assert.ok(volume[2].startsWith('"/'));
    }
  }
});

test('rendered config files identify their target container and in-container path', () => {
  for (const appId of readdirSync(path.join(root, 'apps'))) {
    const manifest = readFileSync(path.join(root, 'apps', appId, 'youeye-app.yaml'), 'utf8');
    if (!manifest.includes('\nconfigFiles:\n')) continue;
    const section = manifest.split('\nconfigFiles:\n', 2)[1];
    const containerSection = manifest.split('\ncontainers:\n', 2)[1].split(/^\S/m, 1)[0];
    const containerNames = new Set([...containerSection.matchAll(/^  - name: "([a-z0-9-]+)"/gm)].map(match => match[1]));
    const entries = [...section.matchAll(/^  - container: "([a-z0-9-]+)"\n    path: "([^"]+)"/gm)];
    assert.ok(entries.length > 0, `${appId} has no complete config-file declarations`);
    for (const entry of entries) {
      assert.ok(containerNames.has(entry[1]), `${appId} config targets unknown container ${entry[1]}`);
      assert.ok(entry[2].startsWith('/'), `${appId} config target is not inside its container`);
    }
    assert.doesNotMatch(section, /^  - path:/m, `${appId} config file omits its target container`);
  }
});
