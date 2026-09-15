import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const catalog = readFileSync(new URL('../catalog.yaml', import.meta.url), 'utf8');
const retirementRecord = readFileSync(new URL('../RETIRED.md', import.meta.url), 'utf8');

const RETIRED_IDS = ['planka', 'redlib', 'whoogle'];

test('retired apps stay documented and absent from the installable catalog', () => {
  for (const id of RETIRED_IDS) {
    assert.doesNotMatch(catalog, new RegExp(`\\b${id}\\b`));
    assert.equal(existsSync(new URL(`../apps/${id}`, import.meta.url)), false, `${id} app folder still exists`);
    assert.match(retirementRecord.toLowerCase(), new RegExp(`^## ${id}$`, 'm'));
  }
});
