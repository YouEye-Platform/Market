// Progressive completeness gate for third-party OCI apps.
// Apps leave REMAINING_DEBT only after their own fresh-install acceptance passes.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const appsDir = join(root, 'apps');
const appFolders = readdirSync(appsDir)
  .filter((entry) => statSync(join(appsDir, entry)).isDirectory())
  .sort();

const ACCEPTED = new Set(['actual-budget', 'audiobookshelf', 'docuseal', 'freshrss', 'hedgedoc', 'immich', 'jellyfin', 'jellyseerr', 'kavita', 'linkwarden', 'mealie', 'memos', 'miniflux', 'navidrome', 'nextcloud', 'open-webui', 'paperless-ngx', 'pingvin-share', 'prowlarr', 'qbittorrent', 'radarr', 'searxng', 'sonarr', 'stirling-pdf', 'vaultwarden', 'vikunja', 'wallabag', 'wikiless']);
const REMAINING_DEBT = new Set([]);

function manifest(id) {
  return readFileSync(join(appsDir, id, 'youeye-app.yaml'), 'utf8');
}

function field(text, name) {
  return text.match(new RegExp(`^\\s{2}${name}:\\s*["']?([^"'\\n]+?)["']?\\s*$`, 'm'))?.[1];
}

function screenshots(text) {
  const block = text.match(/^\s{2}screenshots:\s*\n((?:\s{4,}.*\n?)*)/m)?.[1] ?? '';
  const entries = [];
  for (const match of block.matchAll(/^\s{4}- path:\s*"([^"]+)"\s*\n\s{6}caption:\s*"([^"]+)"\s*$/gm)) {
    entries.push({ path: match[1], caption: match[2] });
  }
  return entries;
}

test('catalog completeness baseline accounts for every third-party app exactly once', () => {
  const overlap = [...ACCEPTED].filter((id) => REMAINING_DEBT.has(id));
  const accounted = [...new Set([...ACCEPTED, ...REMAINING_DEBT])].sort();
  assert.deepEqual(overlap, [], `accepted apps still listed as debt: ${overlap.join(', ')}`);
  assert.deepEqual(accounted, appFolders, 'accepted plus debt must equal apps/ folders');
});

test('accepted apps have complete metadata and version-specific detail', () => {
  const required = [
    'name', 'description', 'iconUrl', 'category', 'website', 'developer',
    'license', 'sourceCode', 'support', 'docs', 'tagline', 'defaultSubdomain',
  ];
  const problems = [];
  for (const id of ACCEPTED) {
    const text = manifest(id);
    for (const name of required) {
      if (!field(text, name)) problems.push(`${id}: missing metadata.${name}`);
    }
    if (!/^\s{2}tags:\s*\[[^\]]+\]\s*$/m.test(text)) problems.push(`${id}: missing metadata.tags`);
    if (!/^\s{2}releaseNotes:\s*\|\s*$/m.test(text)) problems.push(`${id}: missing detail.releaseNotes`);
    if (!/^\s{2}longDescription:\s*\|\s*$/m.test(text)) problems.push(`${id}: missing detail.longDescription`);
  }
  assert.deepEqual(problems, [], problems.join('; '));
});

test('accepted apps use immutable OCI image references', () => {
  const problems = [];
  for (const id of ACCEPTED) {
    const images = [...manifest(id).matchAll(/^\s+image:\s*["']?([^"'\s]+)["']?\s*$/gm)].map((match) => match[1]);
    if (images.length === 0) problems.push(`${id}: no OCI image found`);
    for (const image of images) {
      if (!/@sha256:[a-f0-9]{64}$/.test(image)) problems.push(`${id}: mutable image ${image}`);
    }
  }
  assert.deepEqual(problems, [], problems.join('; '));
});

test('accepted apps have effective local icons and captioned local UI screenshots', () => {
  const problems = [];
  for (const id of ACCEPTED) {
    const text = manifest(id);
    const icon = field(text, 'iconUrl') || 'icon.svg';
    if (/^https?:/.test(icon)) problems.push(`${id}: remote icon ${icon}`);
    else if (!existsSync(join(appsDir, id, icon))) problems.push(`${id}: missing icon ${icon}`);

    const entries = screenshots(text);
    if (entries.length < 2) problems.push(`${id}: needs administrator and standard-user UI screenshots`);
    for (const entry of entries) {
      if (/^https?:/.test(entry.path)) problems.push(`${id}: remote screenshot ${entry.path}`);
      else if (!existsSync(join(appsDir, id, entry.path))) problems.push(`${id}: missing screenshot ${entry.path}`);
      if (entry.caption.trim().length < 12) problems.push(`${id}: weak caption for ${entry.path}`);
      if (dirname(entry.path) !== 'screenshots') problems.push(`${id}: screenshot must be co-located under screenshots/`);
    }
  }
  assert.deepEqual(problems, [], problems.join('; '));
});
