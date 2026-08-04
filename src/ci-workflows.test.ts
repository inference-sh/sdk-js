import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..');

function readWorkflow(name: string): string {
  return fs.readFileSync(path.join(repoRoot, '.github/workflows', name), 'utf8');
}

/** Return the shell script body for each `run: |` block in a workflow. */
function extractRunScripts(workflow: string): string[] {
  const scripts: string[] = [];
  const re = /run: \|\n((?:          .*\n)*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(workflow)) !== null) {
    scripts.push(
      match[1]
        .split('\n')
        .map((line) => line.replace(/^          /, ''))
        .join('\n')
        .trimEnd()
    );
  }
  return scripts;
}

describe('update-types workflow template-injection hardening', () => {
  const workflow = readWorkflow('update-types.yml');
  const runScripts = extractRunScripts(workflow);

  it('binds workflow_dispatch inputs via env before shell execution', () => {
    expect(workflow).toMatch(/FILE: \$\{\{ inputs\.file \}\}/);
    expect(workflow).toMatch(/VERSION: \$\{\{ inputs\.version \}\}/);
    expect(workflow).toMatch(/DEST: \$\{\{ inputs\.dest \}\}/);
  });

  it('does not interpolate inputs.* inside run scripts', () => {
    expect(runScripts.length).toBeGreaterThanOrEqual(2);
    for (const script of runScripts) {
      expect(script).not.toMatch(/\$\{\{\s*inputs\./);
    }
  });

  it('uses shell env vars for models fetch and commit steps', () => {
    const [fetchScript, commitScript] = runScripts;

    expect(fetchScript).toContain(
      'gh api "repos/inference-sh/models/contents/${FILE}?ref=${VERSION}"'
    );
    expect(fetchScript).toContain('base64 -d > "$DEST"');

    expect(commitScript).toContain('git diff --quiet -- "$DEST"');
    expect(commitScript).toContain('git add "$DEST"');
    expect(commitScript).toContain(
      'git commit -m "deps: update types from models $VERSION"'
    );
  });
});
