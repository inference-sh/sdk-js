import { readFileSync } from 'fs';
import { join } from 'path';

const workflowPath = join(__dirname, '../.github/workflows/copilot-setup-steps.yml');

/**
 * actions/checkout must set persist-credentials: false so the job token is
 * not written into git config (aikido 836726191+). Release workflows were
 * pinned in 1cd1d55; Copilot setup steps must follow the same rule.
 */
function checkoutBlocksMustDisableCredentialPersistence(yaml: string): void {
  const lines = yaml.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('uses: actions/checkout')) continue;
    const block = lines.slice(i, Math.min(i + 20, lines.length)).join('\n');
    expect(block).toMatch(/persist-credentials:\s*false/);
  }
}

describe('GitHub Actions checkout (copilot-setup-steps)', () => {
  it('copilot-setup-steps.yml disables credential persistence on checkout', () => {
    checkoutBlocksMustDisableCredentialPersistence(readFileSync(workflowPath, 'utf8'));
  });
});