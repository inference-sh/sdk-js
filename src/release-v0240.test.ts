import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

/**
 * Release 794b17f: v0.24.0 — client tool file attachments and tool-result retry.
 */
describe('release v0.24.0 (794b17f)', () => {
  it('ships version 0.24.0 and documents client tool attachments in the changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.24.0');

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/Client tools can return files/);
    expect(changelog).toMatch(/ToolResultRequest\.attachments/);
  });

  it('retries transient tool-result failures in agent actions', () => {
    const actions = readFileSync(join(__dirname, 'agent/actions.ts'), 'utf8');
    expect(actions).toMatch(/deliverToolResult/);
    expect(actions).toMatch(/TOOL_RESULT_MAX_ATTEMPTS/);
    expect(actions).toMatch(/function isTransient/);
    expect(actions).toMatch(/status >= 500 \|\| status === 408 \|\| status === 429/);
  });

  it('exports ClientToolResult from the agent barrel', () => {
    const index = readFileSync(join(__dirname, 'agent/index.ts'), 'utf8');
    expect(index).toMatch(/ClientToolResult/);
    const types = readFileSync(join(__dirname, 'agent/types.ts'), 'utf8');
    expect(types).toMatch(/export type ClientToolResult = string \| \{ result: string; attachments\?: FileRef\[\] \}/);
  });
});
