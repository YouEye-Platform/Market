// Exercise the complete suite in real release checkouts, not only dev fixtures.
import { cpSync, mkdtempSync, readdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('..', import.meta.url));
for (const [destination, branch, version, tag] of [
  ['forgejo-main', 'main', '0.6.0.0.1', 'catalog-v0.6.0.0.1'],
  ['github-beta', 'beta', '0.6.0.1', 'catalog-beta-v0.6.0.1'],
  ['github-main', 'main', '0.6.1', 'catalog-v0.6.1'],
]) {
  const directory = mkdtempSync(join(tmpdir(), 'market-release-profile-'));
  const run = (command, args) => execFileSync(command, args, { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 8 * 1024 * 1024 });
  try {
    cpSync(root, directory, { recursive: true, filter: path => !path.split('/').some(p => ['.git', 'node_modules'].includes(p)) });
    // Mirror Infra's registered bare-repository projection in public fixtures.
    if (destination.startsWith('github-')) {
      for (const file of ['catalog.yaml', 'scripts/catalog-snapshot.mjs', 'tests/catalog-structure.spec.mjs']) {
        const path = join(directory, file);
        let text = readFileSync(path, 'utf8');
        for (const name of ['Wiki', 'Search', 'Notes', 'Cinema', 'Weather', 'Translate']) {
          text = text.replaceAll('potemsla/YE-App-' + name, 'YouEye-Platform/' + name);
        }
        writeFileSync(path, text);
      }
    }
    run(process.execPath, ['scripts/catalog-snapshot.mjs', 'generate', '--version', version, '--branch', branch]);
    run('git', ['init', '--initial-branch=' + branch, '--template=']);
    run('git', ['config', 'user.name', 'Release profile fixture']);
    run('git', ['config', 'user.email', 'fixture@example.invalid']);
    run('git', ['config', 'commit.gpgsign', 'false']);
    run('git', ['add', '.']);
    run('git', ['commit', '-m', 'Release profile fixture']);
    run('git', ['-c', 'tag.gpgSign=false', 'tag', tag]);
    run(process.execPath, ['scripts/catalog-snapshot.mjs', 'validate', '--release', '--destination', destination]);
    const tests = readdirSync(join(directory, 'tests')).filter(p => p.endsWith('.spec.mjs')).sort().map(p => 'tests/' + p);
    const output = run(process.execPath, ['--test', ...tests]).toString();
    console.log(destination + ': release validation and complete test suite passed');
    console.log(output.split('\n').filter(line => /^# (tests|pass|fail) /.test(line)).join('\n'));
  } catch (error) {
    if (error.stdout) process.stderr.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    throw new Error(destination + ': release profile regression failed');
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
