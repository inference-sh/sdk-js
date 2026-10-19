import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * approveTool/rejectTool resolve the call's interrupt (a8acb6f); changelog
 * 85fa26b documents the 0.31.0 release note. Internal /tools/{id}/invoke|reject
 * helpers are removed — approvals go through resolveInterrupt only.
 */
describe('approveTool and rejectTool via interrupt resolve (a8acb6f)', () => {
  const apiSource = readFileSync(join(__dirname, 'api.ts'), 'utf8');
  const actionsSource = readFileSync(join(__dirname, 'actions.ts'), 'utf8');
  const changelog = readFileSync(join(__dirname, '../../CHANGELOG.md'), 'utf8');

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

  it('documents interrupt-based approvals in the changelog (85fa26b)', () => {
    expect(changelog).toMatch(/## \[Unreleased\]/);
    expect(changelog).toMatch(/approveTool.*rejectTool.*resolve the call's interrupt/i);
    expect(changelog).toMatch(/POST \/interrupts\/\{id\}\/resolve/);
    expect(changelog).toMatch(/no longer post to `\/tools\/\{id\}\/invoke\|reject`/);
    expect(changelog).toMatch(/resolveInterrupt.*optional `reason`/i);
  });
});
