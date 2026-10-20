import { execSync } from 'child_process';
import { chmodSync, cpSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const root = join(__dirname, '..');

/**
 * da496af: make release and scripts/bump.sh must read package.json for the SDK
 * version. app-v* tags are lexicographically "nearest" to git describe and
 * previously made release push app-v681 instead of v0.31.x.
 */
describe('release version from package.json (da496af)', () => {
  const makefile = readFileSync(join(root, 'Makefile'), 'utf8');
  const bumpSource = readFileSync(join(root, 'scripts/bump.sh'), 'utf8');

  it('make release derives VERSION from package.json and requires that tag at HEAD', () => {
    const releaseBlock = makefile.match(/^release:[\s\S]*?(?=^\S|\z)/m)?.[0] ?? '';
    expect(releaseBlock).toContain('require(\'./package.json\').version');
    expect(releaseBlock).not.toMatch(/git describe --tags --abbrev=0/);
    expect(releaseBlock).toMatch(
      /VERSION is not tagged at HEAD: run make patch, minor or major/,
    );
  });

  it('scripts/bump.sh bumps from package.json, not git describe or svu', () => {
    expect(bumpSource).toMatch(
      /version=\$\(node -p "require\('\.\/package\.json'\)\.version"\)/,
    );
    expect(bumpSource).not.toMatch(/git describe --tags --abbrev=0/);
    expect(bumpSource).not.toMatch(/command -v svu/);
    expect(bumpSource).not.toMatch(/svu "\$1"/);
  });

  it('bump.sh patch ignores app-v* tags and increments package.json', () => {
    const work = mkdtempSync(join(tmpdir(), 'sdk-bump-'));
    cpSync(join(root, 'scripts/bump.sh'), join(work, 'bump.sh'));
    chmodSync(join(work, 'bump.sh'), 0o755);

    execSync('git init -q', { cwd: work });
    execSync(
      'git -c user.email=test@test -c user.name=test commit --allow-empty -q -m init',
      { cwd: work },
    );
    writeFileSync(
      join(work, 'package.json'),
      JSON.stringify({ name: '@inferencesh/sdk-test', version: '0.31.0' }, null, 2) + '\n',
    );
    execSync('git add package.json', { cwd: work });
    execSync(
      'git -c user.email=test@test -c user.name=test commit -q -m pkg',
      { cwd: work },
    );
    execSync('git tag v0.31.0', { cwd: work });
    execSync('git tag app-v681', { cwd: work });

    expect(execSync('git describe --tags --abbrev=0', { cwd: work, encoding: 'utf8' }).trim()).toBe(
      'app-v681',
    );

    execSync('./bump.sh patch', { cwd: work, encoding: 'utf8' });

    const pkg = JSON.parse(readFileSync(join(work, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.31.1');
    expect(
      execSync('git tag --list', { cwd: work, encoding: 'utf8' }).trim().split('\n').sort(),
    ).toEqual(['app-v681', 'v0.31.0', 'v0.31.1']);
  });
});
