import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..');

function readWorkflow(name: string): string {
  return fs.readFileSync(path.join(repoRoot, '.github/workflows', name), 'utf8');
}

describe('CI workflow integrity', () => {
  it('ci.yml runs npm ci, test, and build on node 24', () => {
    const ci = readWorkflow('ci.yml');

    expect(ci).toContain('node-version: 24');
    expect(ci).toContain('run: npm ci');
    expect(ci).toContain('run: npm test');
    expect(ci).toContain('run: npm run build');
  });

  it('npm-publish.yml mirrors ci toolchain on node 24', () => {
    const publish = readWorkflow('npm-publish.yml');

    expect(publish).toContain('node-version: 24');
    expect(publish).toContain('run: npm ci');
  });

  it('.mise.toml node pin matches workflow node version', () => {
    const mise = fs.readFileSync(path.join(repoRoot, '.mise.toml'), 'utf8');
    const ci = readWorkflow('ci.yml');

    expect(mise).toMatch(/node\s*=\s*"24"/);
    expect(ci).toContain('node-version: 24');
  });
});

describe('update-types workflow', () => {
  const workflow = readWorkflow('update-types.yml');

  it('is manually dispatched with version, file, and dest inputs', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('version:');
    expect(workflow).toContain('file:');
    expect(workflow).toContain('dest:');
    expect(workflow).toContain('required: true');
  });

  it('checks out dev and commits type updates back to dev', () => {
    expect(workflow).toContain('ref: dev');
    expect(workflow).toContain('git push origin dev');
    expect(workflow).toContain('deps: update types from models');
  });

  it('fetches types from the models repo via gh api with REPO_PAT', () => {
    expect(workflow).toContain('repos/inference-sh/models/contents/');
    expect(workflow).toContain('GH_TOKEN: ${{ secrets.REPO_PAT }}');
    expect(workflow).toContain('base64 -d');
  });

  it('skips commit when the destination file is unchanged', () => {
    expect(workflow).toContain('git diff --quiet');
    expect(workflow).toContain('No changes to types');
  });
});
