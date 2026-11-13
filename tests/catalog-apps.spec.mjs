// Structural checks of the youeye.app.v1 catalog. Dependency-free (node:test only), so these are
// text checks; the full check of every manifest and setup file is the Control Panel's own
// validator (parseApp, parseSetup), run over the catalog in the YouEye repository.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { appFolders, validateCatalogFiles, validateCatalogIndex } from '../scripts/catalog-snapshot.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const catalog = readFileSync(join(root, 'catalog.yaml'), 'utf8');
const apps = appFolders(root);
const manifest = (id) => readFileSync(join(root, 'apps', id, 'youeye-app.yaml'), 'utf8');
const setupFiles = (id) => {
  const directory = join(root, 'apps', id, 'setup');
  return existsSync(directory) ? readdirSync(directory).sort().map(name => ({ name, text: readFileSync(join(directory, name), 'utf8') })) : [];
};

/** The lines of a top-level block (`key:` up to the next top-level key). */
function block(text, key) {
  const start = text.search(new RegExp(`^${key}:`, 'm'));
  if (start < 0) return '';
  const rest = text.slice(start).split('\n');
  const lines = [rest[0]];
  for (const line of rest.slice(1)) {
    if (/^\S/.test(line) && !line.startsWith('#')) break;
    lines.push(line);
  }
  return lines.join('\n');
}

// Accepted apps passed their own fresh-install acceptance; new apps start in REMAINING_DEBT.
const ACCEPTED = new Set(['actual-budget', 'audiobookshelf', 'docuseal', 'freshrss', 'hedgedoc', 'immich', 'jellyfin', 'jellyseerr', 'kavita', 'linkwarden', 'mealie', 'memos', 'miniflux', 'navidrome', 'nextcloud', 'open-webui', 'paperless-ngx', 'pingvin-share', 'prowlarr', 'qbittorrent', 'radarr', 'searxng', 'sonarr', 'stirling-pdf', 'vaultwarden', 'vikunja', 'wallabag', 'wikiless']);
const REMAINING_DEBT = new Set(['razzia']);

test('catalog index, app folders, setup files, bundles and system apps are structurally valid', () => {
  assert.ok(apps.length > 0);
  assert.deepEqual([...validateCatalogIndex(catalog, root), ...validateCatalogFiles(root)], []);
});

test('the completeness baseline accounts for every app folder exactly once', () => {
  const overlap = [...ACCEPTED].filter((id) => REMAINING_DEBT.has(id));
  assert.deepEqual(overlap, []);
  assert.deepEqual([...new Set([...ACCEPTED, ...REMAINING_DEBT])].sort(), apps);
});

test('accepted apps have complete store listings with local icons and captioned screenshots', () => {
  const problems = [];
  for (const id of ACCEPTED) {
    const listing = block(manifest(id), 'listing');
    for (const field of ['tagline', 'description', 'long_description', 'release_notes', 'category', 'tags', 'icon',
      'icon_file', 'website', 'developer', 'license', 'source_code', 'support', 'docs']) {
      if (!new RegExp(`^  ${field}:`, 'm').test(listing)) problems.push(`${id}: listing.${field} missing`);
    }
    const icon = listing.match(/^  icon_file:\s*["']?([^"'\s]+)/m)?.[1];
    if (icon && (/^https?:/.test(icon) || !existsSync(join(root, 'apps', id, icon)))) problems.push(`${id}: icon ${icon} is not a local file`);
    const shots = [...listing.matchAll(/path:\s*["']?([^,"'}\s]+)["']?,?\s*caption:\s*["']?([^}\n]+?)["']?\s*}?$/gm)];
    if (shots.length < 2) problems.push(`${id}: needs at least two captioned screenshots`);
    for (const [, path, caption] of shots) {
      if (dirname(path) !== 'screenshots' || !existsSync(join(root, 'apps', id, path))) problems.push(`${id}: screenshot ${path} missing`);
      if (caption.trim().length < 12) problems.push(`${id}: weak caption for ${path}`);
    }
  }
  assert.deepEqual(problems, [], problems.join('; '));
});

// The variable registry of YouEye docs/app-environment.md.
const MANIFEST_VARIABLES = [
  /^platform\.(domain|version|locale|timezone|site_name)$/,
  /^app\.(id|name|subdomain|fqdn|url|internal_url)$/,
  /^sidecar\.[a-z0-9-]+\.(host|url)$/,
  /^secret\.[a-z0-9_]{1,40}$/,
  /^database\.(url|host|port|name|user|password)$/,
  /^sso\.(slug|issuer|discovery_url|authorize_url|client_id|client_secret|callback_url|logout_url|admin_group)$/,
  /^identity\.(name|external_url|internal_url)$/,
  /^smtp\.(host|port|user|password|from|security)$/,
  /^ai\.(openai_base_url|anthropic_base_url|google_base_url|api_key|default_model|utility_model)$/,
  /^youeye\.(gateway_url|app_token)$/,
];
const SETUP_VARIABLES = [/^vars\.[A-Za-z_][\w.]*$/, /^item\.[A-Za-z_][\w.]*$/];
const CONNECT_VARIABLES = [/^peer\.(id|host|url|api_key)$/, /^self\.(host|url|api_key)$/];

function variableProblems(where, text, allowed, declared) {
  const problems = [];
  const body = text.split('\n').filter(line => !line.trimStart().startsWith('#')).join('\n');
  for (const [, name] of body.matchAll(/\$\{([^}]+)\}/g)) {
    if (!allowed.some(pattern => pattern.test(name))) { problems.push(`${where}: unknown variable \${${name}}`); continue; }
    const sidecar = name.match(/^sidecar\.([a-z0-9-]+)\./)?.[1];
    if (sidecar && !declared.sidecars.includes(sidecar)) problems.push(`${where}: \${${name}} names no declared sidecar`);
    for (const feature of ['sso', 'smtp', 'ai', 'database']) {
      if (name.startsWith(`${feature}.`) && !declared[feature]) problems.push(`${where}: \${${name}} without ${feature}:`);
    }
  }
  return problems;
}

test('every ${…} variable is in the registry and its feature is declared', () => {
  const problems = [];
  for (const id of apps) {
    const text = manifest(id);
    const declared = {
      sidecars: [...block(text, 'sidecars').matchAll(/^  - name:\s*([a-z0-9-]+)/gm)].map(match => match[1]),
      sso: /^sso:/m.test(text), smtp: /^smtp:/m.test(text), ai: /^ai:/m.test(text), database: /^database:/m.test(text),
    };
    problems.push(...variableProblems(`${id}/youeye-app.yaml`, text, MANIFEST_VARIABLES, declared));
    for (const { name, text: setup } of setupFiles(id)) {
      const allowed = [...MANIFEST_VARIABLES, ...SETUP_VARIABLES, ...(name.startsWith('connect-') ? CONNECT_VARIABLES : [])];
      problems.push(...variableProblems(`${id}/setup/${name}`, setup, allowed, declared));
    }
  }
  assert.deepEqual(problems, [], problems.join('; '));
});

test('setup steps use relative paths and act only on the app\'s own containers', () => {
  const problems = [];
  for (const id of apps) {
    const text = manifest(id);
    const own = ['main', ...[...block(text, 'sidecars').matchAll(/^  - name:\s*([a-z0-9-]+)/gm)].map(match => match[1])];
    for (const { name, text: setup } of setupFiles(id)) {
      const where = `${id}/setup/${name}`;
      const forValue = setup.match(/^for:\s*(\S+)/m)?.[1];
      const expected = name === 'sso.yaml' ? 'sso' : name === 'install.yaml' ? 'install' : name === 'url-change.yaml' ? 'url-change'
        : `connect:${name.replace(/^connect-/, '').replace(/\.yaml$/, '')}`;
      if (forValue !== expected) problems.push(`${where}: for is ${forValue}, expected ${expected}`);
      for (const [, path] of setup.matchAll(/^\s+path:\s*["']?(\S+?)["']?\s*$/gm)) {
        if (!path.startsWith('/')) problems.push(`${where}: path ${path} is not relative to the app`);
      }
      if (/^\s+url:/m.test(setup)) problems.push(`${where}: steps take a relative path, not a url`);
      if (/\$\{(container|wire|install|secrets|containers|integration)\./.test(setup)) problems.push(`${where}: removed variable`);
      for (const [, container] of setup.matchAll(/container:\s*["']?([a-z0-9-]+)/g)) {
        if (!own.includes(container)) problems.push(`${where}: container ${container} is not part of ${id}`);
      }
      if (/target:\s*peer/.test(setup) && !name.startsWith('connect-')) problems.push(`${where}: target: peer outside a connect file`);
    }
  }
  assert.deepEqual(problems, [], problems.join('; '));
});

test('no old-format fields or variable names remain', () => {
  const old = /^(apiVersion|kind|metadata|detail|containers|env_mapping|configFiles|wants|apiKey|forwardAuth|integration|reconfigure|uninstall|backup|update):/m;
  const problems = [];
  for (const id of apps) {
    if (old.test(manifest(id))) problems.push(`${id}: ${manifest(id).match(old)[1]}`);
    if (/\$\{(secrets|containers|integration|install|container|wire|installParams)\./.test(manifest(id))) problems.push(`${id}: removed variable`);
    // x- keys are for third-party notes; a shipped app must use real fields (an x- key is never read).
    for (const { name, text } of [{ name: 'youeye-app.yaml', text: manifest(id) }, ...setupFiles(id)]) {
      const xKey = text.match(/^\s*(?:- )?(x-[a-z0-9-]+):/m);
      if (xKey) problems.push(`${id}/${name}: ${xKey[1]}`);
    }
    if (/^api_key:.*\b(file|regex)\b/m.test(manifest(id))) problems.push(`${id}: api_key must name a secret`);
  }
  assert.equal(existsSync(join(root, 'integrations')), false, 'integrations/ became apps/<id>/setup/sso.yaml');
  assert.equal(existsSync(join(root, 'updates')), false, 'update plans are gone');
  assert.deepEqual(problems, [], problems.join('; '));
});

test('external apps do not advertise dashboard widgets without a YouEye embed implementation', () => {
  const offenders = apps.filter((id) => /kind:\s*widget/.test(manifest(id)) && /placement:\s*dashboard/.test(manifest(id)));
  assert.deepEqual(offenders, []);
});

test('Open WebUI auto-activates OIDC users as standard users and delegates models to Pointer', () => {
  const text = manifest('open-webui');
  assert.match(block(text, 'sso'), /^\s+ENABLE_OAUTH_SIGNUP:\s*["']true["']\s*$/m);
  assert.match(block(text, 'env'), /^\s+DEFAULT_USER_ROLE:\s*user\s*$/m);
  assert.doesNotMatch(text, /DEFAULT_USER_ROLE:\s*["']?admin/);
  assert.match(block(text, 'env'), /^\s+BYPASS_MODEL_ACCESS_CONTROL:\s*["']true["']\s*$/m);
  const ai = block(text, 'ai');
  assert.match(ai, /OPENAI_API_BASE_URL: \$\{ai\.openai_base_url\}/);
  assert.match(ai, /OPENAI_API_KEY: \$\{ai\.api_key\}/);
  assert.match(ai, /DEFAULT_MODELS: \$\{ai\.default_model\}/);
  assert.match(ai, /TASK_MODEL_EXTERNAL: \$\{ai\.utility_model\}/);
});

test('the media apps share one media folder and connect to the downloader with its password', () => {
  for (const id of ['qbittorrent', 'sonarr', 'radarr', 'jellyfin']) assert.match(block(manifest(id), 'shared'), /^  media: \/data$/m, id);
  const install = setupFiles('qbittorrent').find(({ name }) => name === 'install.yaml');
  assert.ok(install, 'qBittorrent creates the shared library folders');
  assert.doesNotMatch(install.text, /AuthSubnetWhitelist|LocalHostAuth=false/, 'no subnet bypasses the WebUI password');
  assert.match(manifest('qbittorrent'), /^api_key: \{secret: admin_password\}$/m);
  for (const id of ['sonarr', 'radarr']) {
    const connect = setupFiles(id).find(({ name }) => name === 'connect-qbittorrent.yaml');
    assert.match(connect.text, /name: password\n\s+value: \$\{peer\.api_key\}/, `${id} signs in to qBittorrent`);
  }
  for (const id of ['sonarr', 'radarr']) {
    for (const { text } of setupFiles(id)) assert.doesNotMatch(text, /exec:/, `${id} runs nothing inside another app`);
  }
});
