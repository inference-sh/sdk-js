import { readFileSync } from 'fs';
import { join } from 'path';

const makefilePath = join(__dirname, '../Makefile');

/** Extract the `release:` recipe (tab-indented Make lines until the next target). */
function releaseRecipe(makefile: string): string {
  const lines = makefile.split('\n');
  const start = lines.findIndex((l) => l.trim() === 'release:');
  if (start === -1) {
    throw new Error('Makefile has no release: target');
  }
  const recipe: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    if (!line.startsWith('\t') && !line.startsWith(' ')) break;
    recipe.push(line);
  }
  return recipe.join('\n');
}

/**
 * Commit 9998cd0: main is branch-ruleset protected — promote dev through a PR,
 * then push the merged head to main (with retries), never dual-push dev+main.
 */
describe('Makefile release (main via PR, 9998cd0)', () => {
  const makefile = readFileSync(makefilePath, 'utf8');
  const release = releaseRecipe(makefile);

  it('documents that main only moves through a PR', () => {
    expect(makefile).toMatch(/main only moves through a PR/i);
  });

  it('does not dual-push dev and main in one git push (ruleset bypass regression)', () => {
    expect(release).not.toMatch(/git push origin HEAD:dev HEAD:main/);
  });

  it('pushes dev and the version tag before promoting main', () => {
    expect(release).toMatch(/git push origin HEAD:dev "\$\$VERSION"/);
  });

  it('opens promote dev → main PR before pushing main', () => {
    expect(release).toMatch(
      /gh pr create --base main --head dev --title "promote dev → main"/
    );
  });

  it('retries pushing HEAD:main after the PR merge (ruleset window)', () => {
    expect(release).toMatch(/for i in 1 2 3 4 5 6/);
    expect(release).toMatch(/git push origin HEAD:main/);
  });
});