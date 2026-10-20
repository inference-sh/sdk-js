import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release c4f8d5b / changelog 4d06caf: v0.32.0 documents interrupt-based
 * approveTool/rejectTool (a8acb6f) and optional deny reason on resolveInterrupt.
 */
describe('release v0.32.0 (c4f8d5b / 4d06caf)', () => {
  const apiSource = readFileSync(join(__dirname, 'agent/api.ts'), 'utf8');
  const actionsSource = readFileSync(join(__dirname, 'agent/actions.ts'), 'utf8');
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');

  it('ships version 0.32.0 with an empty Unreleased section and a dated 0.32.0 changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.32.0');
    expect(SDK_VERSION).toBe('0.32.0');

    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.32\.0\] - 2026-10-20/);
    expect(changelog).toMatch(/## \[0\.32\.0\] - 2026-10-20[\s\S]*?approveTool.*rejectTool.*resolve the call's interrupt/i);
    expect(changelog).toMatch(/POST \/interrupts\/\{id\}\/resolve/);
    expect(changelog).toMatch(/no longer post to `\/tools\/\{id\}\/invoke\|reject`/);
    expect(changelog).toMatch(/resolveInterrupt.*optional `reason`/i);
    expect(changelog).toMatch(/## \[0\.31\.0\] - 2026-10-19/);
  });

  it('drops standalone approveTool/rejectTool HTTP helpers from agent/api.ts', () => {
    expect(apiSource).not.toMatch(/export async function approveTool/);
    expect(apiSource).not.toMatch(/export async function rejectTool/);
    expect(apiSource).not.toMatch(/\/tools\/\$\{toolInvocationId\}\/invoke/);
    expect(apiSource).not.toMatch(/\/tools\/\$\{toolInvocationId\}\/reject/);
    expect(apiSource).toMatch(/export async function resolveInterrupt/);
    expect(apiSource).toMatch(/reason \? \{ decision, data: \{ reason \} \}/);
  });

  it('routes approveTool and rejectTool through approvalInterruptId and resolveInterrupt', () => {
    expect(actionsSource).toMatch(/const approvalInterruptId = async/);
    expect(actionsSource).toContain('approvalInterrupt(chat?.pending_interrupts, toolInvocationId)');
    expect(actionsSource).toContain('await api.listRunInterrupts(client, runId)');
    expect(actionsSource).toMatch(
      /approveTool:[\s\S]*?await api\.resolveInterrupt\(client, await approvalInterruptId\(toolInvocationId\), 'allow'\)/,
    );
    expect(actionsSource).toMatch(
      /rejectTool:[\s\S]*?await api\.resolveInterrupt\(client, await approvalInterruptId\(toolInvocationId\), 'deny', reason\)/,
    );
    expect(actionsSource).toContain('Tool call ${toolInvocationId} is not awaiting approval');
  });
});
