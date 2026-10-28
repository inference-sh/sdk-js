import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version.js';
import type { ToolResultRequest } from './types.js';

const root = join(__dirname, '..');

function interfaceBlock(typesSource: string, name: string): string {
  const start = typesSource.indexOf(`export interface ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const slice = typesSource.slice(start);
  const end = slice.indexOf('\nexport ');
  return end === -1 ? slice : slice.slice(0, end);
}

/**
 * Release 9595659 / changelog 0.36.0 (42e0216, 58a6ced): client tools fail via
 * ToolResultRequest.error and submitToolError; missing or throwing handlers no
 * longer complete with error text as a successful result.
 */
describe('release v0.36.0 (9595659)', () => {
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const actionsSource = readFileSync(join(__dirname, 'agent/actions.ts'), 'utf8');

  it('ships version 0.36.0 with an empty Unreleased section and a dated 0.36.0 changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.36.0');
    expect(SDK_VERSION).toBe('0.36.0');

    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.36\.0\] - 2026-10-28/);
    expect(changelog).toMatch(/`submitToolError`/);
    expect(changelog).toMatch(/`ToolResultRequest\.error`/);
    expect(changelog).toMatch(/no handler, or whose handler throws, now fails its call/);
    expect(changelog).toMatch(/## \[0\.35\.1\] - 2026-10-28/);
  });

  it('types optional error on ToolResultRequest for failed client tool POST bodies', () => {
    const failure: ToolResultRequest = {
      result: '',
      error: 'node "x" does not exist',
    };
    const success: ToolResultRequest = { result: 'done' };
    expect(failure.error).toBe('node "x" does not exist');
    expect(success).not.toHaveProperty('error');

    const block = interfaceBlock(typesSource, 'ToolResultRequest');
    expect(block).toMatch(/completes as failed/);
    expect(block).toMatch(/reads Error in place of Result/);
    expect(block).toMatch(/error\?: string/);
  });

  it('routes handler { error } through submitToolError in the agent stream path', () => {
    expect(actionsSource).toMatch(/else if \('error' in output\) await api\.submitToolError/);
    expect(actionsSource).toMatch(/Posts a handler's output: a result, or an error that fails the call/);
  });
});
