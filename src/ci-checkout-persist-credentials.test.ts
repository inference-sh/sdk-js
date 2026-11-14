import { readFileSync } from 'fs';
import { join } from 'path';

const workflowsDir = join(__dirname, '../.github/workflows');

/**
 * Every actions/checkout step in release CI must set persist-credentials: false
 * so the job token is not written into the local git config (aikido 836726191+).
 */
function checkoutBlocksMustDisableCredentialPersistence(yaml: string): void {
  const lines = yaml.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('uses: actions/checkout')) continue;
    const block = lines.slice(i, Math.min(i + 20, lines.length)).join('\n');
    expect(block).toMatch(/persist-credentials:\s*false/);
  }
}

describe('GitHub Actions checkout (1cd1d55)', () => {
  it('ci.yml disables credential persistence on every checkout step', () => {
    checkoutBlocksMustDisableCredentialPersistence(
      readFileSync(join(workflowsDir, 'ci.yml'), 'utf8'),
    );
  });

  it('npm-publish.yml disables credential persistence on every checkout step', () => {
    checkoutBlocksMustDisableCredentialPersistence(
      readFileSync(join(workflowsDir, 'npm-publish.yml'), 'utf8'),
    );
  });
});