import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
// External apps now live under apps/<id>/ (per-app folder layout; the old external/ dir was removed).
const appsDir = join(root, 'apps');

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test('external apps do not advertise dashboard widgets without a YouEye embed implementation', () => {
  const offenders = walk(appsDir)
    .filter((path) => path.endsWith('.yaml') || path.endsWith('.yml'))
    .filter((path) => {
      const text = readFileSync(path, 'utf8');
      return /kind:\s*["']?widget["']?/.test(text) && /placement:\s*["']?dashboard["']?/.test(text);
    });

  assert.deepEqual(offenders, []);
});
