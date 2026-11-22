import { readFileSync } from 'fs';
import { join } from 'path';

const workflowPath = join(__dirname, '../.github/workflows/npm-publish.yml');

/**
 * f44ec92: release publish uses npm trusted publishing (GitHub OIDC) instead of
 * secrets.NPM_TOKEN. Re-adding a token breaks provenance and revives secret rot.
 */
describe('npm-publish.yml trusted publishing (f44ec92)', () => {
  const workflow = readFileSync(workflowPath, 'utf8');

  it('grants id-token write on the publish job for OIDC provenance', () => {
    expect(workflow).toMatch(/id-token:\s*write/);
  });

  it('does not reference secrets.NPM_TOKEN anywhere in the workflow', () => {
    expect(workflow).not.toMatch(/secrets\.NPM_TOKEN/);
    expect(workflow).not.toMatch(/NPM_TOKEN/);
  });

  it('publishes with provenance and without a NODE_AUTH_TOKEN env block', () => {
    expect(workflow).toMatch(/pnpm publish[^\n]*--provenance/);
    const publishStep = workflow.split(/\n\s+- name: Publish to npm\n/)[1] ?? '';
    expect(publishStep).not.toMatch(/NODE_AUTH_TOKEN/);
    expect(publishStep).not.toMatch(/env:\s*\n/);
  });

  it('documents trusted publishing on the publish step', () => {
    expect(workflow).toMatch(/npm trusted publishing/i);
  });
});